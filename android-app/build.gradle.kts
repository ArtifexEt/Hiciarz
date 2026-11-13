buildscript {
    dependencies {
        constraints {
            add("classpath", "org.bouncycastle:bcprov-jdk18on:1.85") {
                because("Fix CVE-2026-8763 and CVE-2026-13506 in the build tool classpath.")
            }
            add("classpath", "org.bouncycastle:bcpkix-jdk18on:1.85") {
                because("Keep Bouncy Castle provider, PKIX and utility modules compatible.")
            }
            add("classpath", "org.bouncycastle:bcutil-jdk18on:1.85") {
                because("Keep Bouncy Castle provider, PKIX and utility modules compatible.")
            }
            add("classpath", "org.jdom:jdom2:2.0.6.1") {
                because("Fix CVE-2021-33813 in the optional Jetifier tool dependency.")
            }
            add("classpath", "org.bitbucket.b_c:jose4j:0.9.6") {
                because("Fix CVE-2024-29371 in the bundletool dependency.")
            }
            add("classpath", "com.google.guava:guava:33.7.2-jre") {
                because("Fix CVE-2026-102554 in the JVM build tools.")
            }
        }
    }
}

plugins {
    id("com.android.application") version "9.5.1" apply false
    id("org.jetbrains.kotlin.plugin.compose") version "2.2.10" apply false
}

allprojects {
    val securityMinimums = configurations.create("securityMinimums") {
        isCanBeConsumed = false
        isCanBeResolved = false
    }
    listOf(
        "org.bouncycastle:bcprov-jdk18on:1.85",
        "org.bouncycastle:bcpkix-jdk18on:1.85",
        "org.bouncycastle:bcutil-jdk18on:1.85",
        "org.jdom:jdom2:2.0.6.1",
        "org.bitbucket.b_c:jose4j:0.9.6",
        "com.google.guava:guava:33.7.2-android",
    ).forEach { minimum ->
        dependencies.constraints.add(securityMinimums.name, minimum) {
            because("Keep security fixes in AGP's isolated tools and existing dependencies.")
        }
    }
    // Constraints do not add libraries. Inherit them in AGP's worker and lint
    // configurations too; plugin classpaths are constrained separately above.
    configurations.configureEach {
        if (name != securityMinimums.name) extendsFrom(securityMinimums)
    }
}

// Optional local build directory on a fast volume; CI uses the standard paths.
System.getenv("HICIARZ_BUILD_ROOT")?.let { base ->
    allprojects {
        layout.buildDirectory.set(file("$base/${project.name}"))
    }
}
