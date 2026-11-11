package pl.artifex.hiciarz.data

import android.content.Context
import android.net.Uri
import android.provider.OpenableColumns
import android.util.AtomicFile
import java.io.File
import java.io.ByteArrayOutputStream
import java.io.FileNotFoundException
import java.util.UUID
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONArray
import pl.artifex.hiciarz.model.Deck

class DeckRepository(private val context: Context) {
    private val mutex = Mutex()
    private val storage = AtomicFile(File(context.filesDir, "decks.json"))
    private var custom = emptyList<Deck>()
    private var bundled = emptyList<Deck>()
    // A failed read must never turn the next write into an empty-library replacement.
    private var writable = false

    suspend fun load(): List<Deck> = withContext(Dispatchers.IO) {
        mutex.withLock {
            writable = false
            bundled = context.assets.list("decks").orEmpty().filter { it.endsWith(".json") && !it.startsWith('.') }.map { name ->
                context.assets.open("decks/$name").bufferedReader().use { DeckCodec.parse(it.readText(), name, true) }
            }
            val hadSavedData = storage.baseFile.exists() || File(storage.baseFile.path + ".bak").exists()
            val saved = try {
                // openRead() also restores AtomicFile's backup after an interrupted write.
                storage.openRead().bufferedReader().use { it.readText() }
            } catch (error: FileNotFoundException) {
                if (hadSavedData) throw error
                null
            }
            val restored = saved?.let { text ->
                val rows = JSONArray(text)
                (0 until rows.length()).map { index ->
                    DeckCodec.parse(rows.getJSONObject(index).toString(), "saved.json")
                }
            }.orEmpty()
            if (restored.map { it.id }.distinct().size != restored.size)
                throw DeckFormatException("invalid_deck")
            custom = restored
            writable = true
            bundled + custom
        }
    }

    suspend fun import(uri: Uri): Deck = withContext(Dispatchers.IO) {
        val filename = context.contentResolver.query(uri, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)
            ?.use { cursor -> if (cursor.moveToFirst()) cursor.getString(0) else null } ?: "import.json"
        val bytes = context.contentResolver.openInputStream(uri)?.use { input ->
            val output = ByteArrayOutputStream()
            val buffer = ByteArray(8192)
            while (output.size() <= DeckCodec.MAX_BYTES) {
                val count = input.read(buffer, 0, minOf(buffer.size, DeckCodec.MAX_BYTES + 1 - output.size()))
                if (count < 0) break
                output.write(buffer, 0, count)
            }
            output.toByteArray()
        }
            ?: throw DeckFormatException("import_failed")
        if (bytes.size > DeckCodec.MAX_BYTES) throw DeckFormatException("import_too_large")
        val parsed = DeckCodec.parse(bytes.toString(Charsets.UTF_8), filename)
        mutex.withLock {
            checkWritable()
            val deck = if (bundled.any { it.id == parsed.id }) parsed.copy(id = UUID.randomUUID().toString()) else parsed
            val next = custom.filterNot { it.id == deck.id } + deck
            save(next)
            custom = next
            deck
        }
    }

    suspend fun delete(id: String): List<Deck> = withContext(Dispatchers.IO) {
        mutex.withLock {
            checkWritable()
            val next = custom.filterNot { it.id == id }
            save(next)
            custom = next
            bundled + custom
        }
    }

    fun current(): List<Deck> = bundled + custom

    private fun checkWritable() {
        if (!writable) throw DeckFormatException("import_failed")
    }

    private fun save(decks: List<Deck>) {
        val value = JSONArray(decks.map { org.json.JSONObject(DeckCodec.encode(it)) }).toString()
        val output = storage.startWrite()
        try { output.write(value.toByteArray(Charsets.UTF_8)); storage.finishWrite(output) }
        catch (error: Exception) { storage.failWrite(output); throw error }
    }
}
