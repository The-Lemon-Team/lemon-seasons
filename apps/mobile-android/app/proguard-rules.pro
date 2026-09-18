# Proguard rules for Lemon Lenta Mobile
-keepattributes *Annotation*
-keepclassmembers class * {
    @androidx.room.* <methods>;
}
