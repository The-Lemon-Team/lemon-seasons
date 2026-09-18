package team.lemon.lenta.mobile.data.remote

import retrofit2.Response
import retrofit2.http.*
import team.lemon.lenta.mobile.data.model.QuickShareRequest
import team.lemon.lenta.mobile.data.model.QuickShareResponse
import team.lemon.lenta.mobile.data.model.ValidateKeyResponse

interface LentaApiService {

    @POST("notes/quick-share")
    suspend fun quickShare(
        @Body request: QuickShareRequest,
        @Header("x-user-key") userKey: String? = null
    ): Response<QuickShareResponse>

    @GET("keys/validate")
    suspend fun validateKey(
        @Query("key") key: String
    ): Response<ValidateKeyResponse>

    @GET("health")
    suspend fun healthCheck(): Response<Map<String, Any>>
}
