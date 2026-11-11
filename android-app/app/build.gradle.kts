import org.gradle.api.file.DirectoryProperty
import org.gradle.api.file.FileSystemOperations
import org.gradle.api.tasks.InputDirectory
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.PathSensitive
import org.gradle.api.tasks.PathSensitivity
import org.gradle.api.tasks.TaskAction
import javax.inject.Inject

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

val suppliedSigningFile = providers.environmentVariable("HICIARZ_KEYSTORE_FILE").orNull?.takeIf { it.isNotBlank() }
val productionSigning = providers.environmentVariable("HICIARZ_PRODUCTION_SIGNING").orElse("false").get().toBooleanStrict()
require(!productionSigning || suppliedSigningFile != null) { "Production builds require a private signing keystore." }
fun signingValue(name: String): String = providers.environmentVariable(name).orNull
    ?.takeIf { it.isNotBlank() } ?: error("Missing signing environment variable: $name")
val spotifyClientId = providers.environmentVariable("SPOTIFY_CLIENT_ID")
    .orElse(providers.gradleProperty("spotifyClientId")).orElse("")
abstract class BundleDecks @Inject constructor(private val files: FileSystemOperations) : DefaultTask() {
    @get:InputDirectory @get:PathSensitive(PathSensitivity.RELATIVE)
    abstract val inputDirectory: DirectoryProperty
    @get:OutputDirectory abstract val outputDirectory: DirectoryProperty

    @TaskAction fun bundle() {
        files.sync {
            from(inputDirectory) { include("*.json"); exclude("._*") }
            into(outputDirectory.dir("decks"))
        }
    }
}
val bundledDecks = tasks.register<BundleDecks>("prepareBundledDecks") {
    inputDirectory.set(rootProject.layout.projectDirectory.dir("../web/examples/playlists"))
    outputDirectory.set(layout.buildDirectory.dir("generated/bundled-assets"))
}

android {
    namespace = "pl.artifex.hiciarz"
    compileSdk { version = release(37) { minorApiLevel = 0 } }
    buildToolsVersion = "37.0.0"
    defaultConfig {
        applicationId = "pl.artifex.hiciarz"
        minSdk = 26
        targetSdk = 37
        versionCode = providers.gradleProperty("versionCode").orElse("100001").get().toInt()
        versionName = providers.gradleProperty("versionName").orElse("0.1.0-alpha.1").get()
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        buildConfigField("String", "SPOTIFY_CLIENT_ID", "\"${spotifyClientId.get().replace("\\", "\\\\").replace("\"", "\\\"")}\"")
        buildConfigField("String", "SPOTIFY_REDIRECT_URI", "\"hiciarz://spotify-callback\"")
        buildConfigField("boolean", "TEST_SIGNING", (!productionSigning).toString())
    }
    signingConfigs {
        if (suppliedSigningFile != null) create("distribution") {
            storeFile = file(suppliedSigningFile)
            storePassword = signingValue("HICIARZ_KEYSTORE_PASSWORD")
            keyAlias = signingValue("HICIARZ_KEY_ALIAS")
            keyPassword = signingValue("HICIARZ_KEY_PASSWORD")
        }
    }
    buildTypes {
        debug { signingConfig = signingConfigs.findByName("distribution") ?: signingConfigs.getByName("debug") }
        release {
            signingConfig = signingConfigs.findByName("distribution") ?: signingConfigs.getByName("debug")
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
        }
    }
    buildFeatures { compose = true; buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    packaging { resources.excludes += "/META-INF/{AL2.0,LGPL2.1}" }
    lint { abortOnError = true; checkReleaseBuilds = true }
}
androidComponents.onVariants { variant ->
    variant.sources.assets?.addGeneratedSourceDirectory(bundledDecks, BundleDecks::outputDirectory)
}

dependencies {
    implementation(platform("androidx.compose:compose-bom:2026.09.00"))
    implementation("androidx.core:core-ktx:1.17.0")
    implementation("androidx.activity:activity-compose:1.13.0")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.11.0")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.11.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.foundation:foundation")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.camera:camera-camera2:1.6.2")
    implementation("androidx.camera:camera-lifecycle:1.6.2")
    implementation("androidx.camera:camera-view:1.6.2")
    implementation("com.google.mlkit:barcode-scanning:17.3.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")
    implementation("com.google.code.gson:gson:2.13.2")
    implementation(files("libs/spotify-app-remote-release-0.8.0.aar"))
    debugImplementation("androidx.compose.ui:ui-tooling")
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.json:json:20250517")
    androidTestImplementation(platform("androidx.compose:compose-bom:2026.09.00"))
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("androidx.test:runner:1.7.0")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
