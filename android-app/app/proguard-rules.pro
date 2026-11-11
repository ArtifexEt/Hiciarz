# App Remote serializes protocol models reflectively through Gson.
-keep class com.spotify.protocol.types.** { *; }
-keep class com.spotify.android.appremote.internal.** { *; }
-keepattributes Signature,InnerClasses,EnclosingMethod,RuntimeVisibleAnnotations,AnnotationDefault
-dontwarn javax.annotation.**

# App Remote's ConnectionParams defaults to GsonMapper. ImageUri still references
# its unused Jackson adapters through annotations; their base classes are optional.
-dontwarn com.fasterxml.jackson.databind.deser.std.StdDeserializer
-dontwarn com.fasterxml.jackson.databind.ser.std.StdSerializer

# A declaration annotation used by the SDK, with no runtime implementation.
-dontwarn com.spotify.base.annotations.NotNull
