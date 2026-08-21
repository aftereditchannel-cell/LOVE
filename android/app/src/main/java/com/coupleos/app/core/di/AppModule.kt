package com.coupleos.app.core.di

import android.content.Context
import androidx.room.Room
import com.coupleos.app.BuildConfig
import com.coupleos.app.data.local.database.CoupleOSDatabase
import com.coupleos.app.data.remote.api.CoupleOSApi
import com.coupleos.app.data.remote.api.GitHubApi
import com.coupleos.app.network.interceptor.AuthInterceptor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Named
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): CoupleOSDatabase {
        return Room.databaseBuilder(
            context,
            CoupleOSDatabase::class.java,
            "couple_os_database"
        )
            .fallbackToDestructiveMigration()
            .build()
    }

    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        isLenient = true
        encodeDefaults = true
        prettyPrint = false
        coerceInputValues = true
    }

    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor
    ): OkHttpClient {
        val builder = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(authInterceptor)

        if (BuildConfig.DEBUG) {
            val loggingInterceptor = HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BODY
            }
            builder.addInterceptor(loggingInterceptor)
        }

        return builder.build()
    }

    @Provides
    @Singleton
    @Named("backend")
    fun provideBackendRetrofit(
        okHttpClient: OkHttpClient,
        json: Json
    ): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.API_BASE_URL + "/")
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }

    @Provides
    @Singleton
    @Named("github")
    fun provideGitHubRetrofit(json: Json): Retrofit {
        val client = OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor { chain ->
                val request = chain.request().newBuilder()
                    .header("Accept", "application/vnd.github+json")
                    .header("X-GitHub-Api-Version", "2022-11-28")
                    .build()
                chain.proceed(request)
            }
            .build()

        return Retrofit.Builder()
            .baseUrl("https://api.github.com/")
            .client(client)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }

    @Provides
    @Singleton
    fun provideCoupleOSApi(@Named("backend") retrofit: Retrofit): CoupleOSApi {
        return retrofit.create(CoupleOSApi::class.java)
    }

    @Provides
    @Singleton
    fun provideGitHubApi(@Named("github") retrofit: Retrofit): GitHubApi {
        return retrofit.create(GitHubApi::class.java)
    }

    // DAOs
    @Provides fun provideUserDao(db: CoupleOSDatabase) = db.userDao()
    @Provides fun provideCoupleDao(db: CoupleOSDatabase) = db.coupleDao()
    @Provides fun provideMoodDao(db: CoupleOSDatabase) = db.moodDao()
    @Provides fun provideMemoryDao(db: CoupleOSDatabase) = db.memoryDao()
    @Provides fun provideJournalDao(db: CoupleOSDatabase) = db.journalDao()
    @Provides fun provideMessageDao(db: CoupleOSDatabase) = db.messageDao()
    @Provides fun provideCalendarDao(db: CoupleOSDatabase) = db.calendarDao()
    @Provides fun provideTaskDao(db: CoupleOSDatabase) = db.taskDao()
    @Provides fun provideWishlistDao(db: CoupleOSDatabase) = db.wishlistDao()
    @Provides fun provideBucketItemDao(db: CoupleOSDatabase) = db.bucketItemDao()
    @Provides fun provideLoveLetterDao(db: CoupleOSDatabase) = db.loveLetterDao()
    @Provides fun provideSurpriseDao(db: CoupleOSDatabase) = db.surpriseDao()
    @Provides fun provideCountdownDao(db: CoupleOSDatabase) = db.countdownDao()
    @Provides fun provideExpenseDao(db: CoupleOSDatabase) = db.expenseDao()
    @Provides fun provideTimelineDao(db: CoupleOSDatabase) = db.timelineDao()
    @Provides fun provideDailyQuestionDao(db: CoupleOSDatabase) = db.dailyQuestionDao()
    @Provides fun provideRelationshipCheckinDao(db: CoupleOSDatabase) = db.relationshipCheckinDao()
    @Provides fun provideSyncQueueDao(db: CoupleOSDatabase) = db.syncQueueDao()
}
