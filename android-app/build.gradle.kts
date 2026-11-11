plugins {
    id("com.android.application") version "9.5.1" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.2.10" apply false
}

// Optional local build directory on a fast volume; CI uses the standard paths.
System.getenv("HICIARZ_BUILD_ROOT")?.let { base ->
    allprojects {
        layout.buildDirectory.set(file("$base/${project.name}"))
    }
}
