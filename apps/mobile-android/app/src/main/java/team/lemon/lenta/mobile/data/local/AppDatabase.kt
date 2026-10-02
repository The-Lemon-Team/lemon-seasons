package team.lemon.lenta.mobile.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import team.lemon.lenta.mobile.data.model.MobileNote
import team.lemon.lenta.mobile.data.model.MobileSession
import team.lemon.lenta.mobile.data.model.MobileTodoItem
import team.lemon.lenta.mobile.data.model.PendingShare

@Database(
    entities = [
        PendingShare::class,
        MobileNote::class,
        MobileTodoItem::class,
        MobileSession::class
    ],
    version = 2,
    exportSchema = false
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun pendingShareDao(): PendingShareDao
    abstract fun mobileNoteDao(): MobileNoteDao
    abstract fun mobileTodoDao(): MobileTodoDao
    abstract fun mobileSessionDao(): MobileSessionDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "lemon_lenta_mobile.db"
                )
                    .fallbackToDestructiveMigration()
                    .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
