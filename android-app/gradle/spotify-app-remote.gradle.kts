import java.io.File
import java.net.HttpURLConnection
import java.net.URI
import java.nio.file.AtomicMoveNotSupportedException
import java.nio.file.Files
import java.nio.file.StandardCopyOption
import java.security.MessageDigest
import java.util.HexFormat
import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.Internal
import org.gradle.api.tasks.OutputFile
import org.gradle.api.tasks.TaskAction

abstract class DownloadSpotifyAppRemote : DefaultTask() {
    @get:Input
    abstract val sourceUrl: Property<String>

    @get:Input
    abstract val expectedSha256: Property<String>

    @get:Internal
    abstract val offline: Property<Boolean>

    @get:OutputFile
    abstract val destinationFile: RegularFileProperty

    fun hasVerifiedArtifact(): Boolean {
        val artifact = destinationFile.get().asFile
        return artifact.isFile && sha256(artifact) == expectedSha256.get()
    }

    private fun sha256(file: File): String {
        val digest = MessageDigest.getInstance("SHA-256")
        file.inputStream().use { input ->
            val buffer = ByteArray(8192)
            while (true) {
                val count = input.read(buffer)
                if (count < 0) break
                digest.update(buffer, 0, count)
            }
        }
        return HexFormat.of().formatHex(digest.digest())
    }

    @TaskAction
    fun download() {
        if (hasVerifiedArtifact()) return
        if (offline.get()) {
            throw GradleException(
                "Spotify App Remote SDK is missing or has an invalid SHA-256 checksum. " +
                    "Run :app:downloadSpotifyAppRemote without --offline to download the verified SDK."
            )
        }

        val destination = destinationFile.get().asFile.toPath()
        Files.createDirectories(destination.parent)
        val temporaryFile = Files.createTempFile(destination.parent, "spotify-app-remote-", ".aar.part")
        try {
            val connection = URI.create(sourceUrl.get()).toURL().openConnection() as HttpURLConnection
            connection.connectTimeout = 15_000
            connection.readTimeout = 30_000
            connection.setRequestProperty("User-Agent", "Hiciarz-Gradle")
            try {
                if (connection.responseCode !in 200..299) {
                    throw GradleException("Spotify App Remote SDK download failed: HTTP ${connection.responseCode}.")
                }
                connection.inputStream.use { input ->
                    Files.newOutputStream(temporaryFile).use { output -> input.copyTo(output) }
                }
            } finally {
                connection.disconnect()
            }

            val actualSha256 = sha256(temporaryFile.toFile())
            if (actualSha256 != expectedSha256.get()) {
                throw GradleException(
                    "Spotify App Remote SDK SHA-256 mismatch: expected ${expectedSha256.get()}, got $actualSha256."
                )
            }
            try {
                Files.move(temporaryFile, destination, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING)
            } catch (_: AtomicMoveNotSupportedException) {
                Files.move(temporaryFile, destination, StandardCopyOption.REPLACE_EXISTING)
            }
        } catch (error: java.io.IOException) {
            throw GradleException("Could not download the pinned Spotify App Remote SDK from ${sourceUrl.get()}.", error)
        } finally {
            Files.deleteIfExists(temporaryFile)
        }
    }
}

val upstreamCommit = "5aa4d62465f61a0677081ae9a3108177d0365fc3"

tasks.register<DownloadSpotifyAppRemote>("downloadSpotifyAppRemote") {
    description = "Downloads and verifies the pinned official Spotify App Remote SDK."
    group = "build setup"
    sourceUrl.set(
        "https://raw.githubusercontent.com/spotify/android-sdk/" +
            "$upstreamCommit/" +
            "app-remote-lib/spotify-app-remote-release-0.8.0.aar"
    )
    expectedSha256.set("b5a6dd880eaf01f63a871cba9ef7af77c341f8a94ffc8fdf2e9021f9a9d4c198")
    offline.set(gradle.startParameter.isOffline)
    destinationFile.set(
        File(gradle.gradleUserHomeDir, "caches/hiciarz/spotify-app-remote/$upstreamCommit/spotify-app-remote-release-0.8.0.aar")
    )
    outputs.upToDateWhen { hasVerifiedArtifact() }
}
