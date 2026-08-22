# Couple OS ProGuard Rules

# ── Kotlin serialization ─────────────────────────────────────
# Keep all @Serializable classes and their generated serializers so JSON
# encode/decode keeps working in minified release builds.
-keepattributes *Annotation*, InnerClasses, EnclosingMethod, Signature, RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.json.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.coupleos.app.**$$serializer { *; }
-keepclassmembers class com.coupleos.app.** {
    *** Companion;
}
-keepclasseswithmembers class com.coupleos.app.** {
    kotlinx.serialization.KSerializer serializer(...);
}
# Broad safety net: keep every class annotated @Serializable and its fields.
-keep @kotlinx.serialization.Serializable class com.coupleos.app.** { *; }

# Room
-keep class * extends androidx.room.RoomDatabase
-keep @androidx.room.Entity class *
-dontwarn androidx.room.paging.**

# Retrofit
-keepattributes Signature, InnerClasses, EnclosingMethod
-keepattributes RuntimeVisibleAnnotations, RuntimeVisibleParameterAnnotations
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**
-dontwarn kotlin.Unit
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*

# OkHttp
-dontwarn okhttp3.**
-dontwarn okio.**

# Hilt
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }

# Google Drive API
-keep class com.google.api.** { *; }
-dontwarn com.google.api.**

# Coil
-dontwarn coil.**
