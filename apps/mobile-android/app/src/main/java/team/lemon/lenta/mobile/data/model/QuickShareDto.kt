package team.lemon.lenta.mobile.data.model

import com.google.gson.annotations.SerializedName

data class QuickShareRequest(
    @SerializedName("url")
    val url: String,
    @SerializedName("title")
    val title: String,
    @SerializedName("description")
    val description: String? = null,
    @SerializedName("folder")
    val folder: String? = "Mobile/Shared",
    @SerializedName("containerId")
    val containerId: String? = "main-vault",
    @SerializedName("tags")
    val tags: List<String>? = listOf("mobile", "shared"),
    @SerializedName("userKey")
    val userKey: String? = null,
    @SerializedName("template")
    val template: String? = null
)

data class QuickShareResponse(
    @SerializedName("success")
    val success: Boolean,
    @SerializedName("noteId")
    val noteId: String?,
    @SerializedName("title")
    val title: String?,
    @SerializedName("url")
    val url: String?,
    @SerializedName("folder")
    val folder: String?,
    @SerializedName("containerId")
    val containerId: String?,
    @SerializedName("createdAt")
    val createdAt: String?
)

data class ValidateKeyResponse(
    @SerializedName("valid")
    val valid: Boolean,
    @SerializedName("name")
    val name: String?,
    @SerializedName("userId")
    val userId: String?
)
