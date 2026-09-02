package com.coupleos.app.data.repository

/**
 * Shared user-facing strings for the token ownership model.
 *
 * Rule of the app:
 *  - MY token  = the only place my data is written (ثبت)
 *  - PARTNER token = read-only mirror (فقط بازخوانی)
 */
object TokenOwnership {

    /** Success message after data was really stored on my own token. */
    fun saved(what: String): String = "$what روی توکن خودت ثبت شد ✅"

    /** Failure message including the real error/code so the user can retry. */
    fun failed(error: Throwable?): String {
        val detail = error?.message?.takeIf { it.isNotBlank() } ?: "خطای نامشخص"
        return "ثبت نشد ❌ $detail — تلاش مجدد"
    }

    /** Shown when the user tries to modify something owned by the partner token. */
    const val READ_ONLY = "این مورد از توکن پارتنرته — فقط قابل مشاهده‌ست 👁️ نمی‌تونی ویرایش یا حذفش کنی"

    /** Shown when there is no personal token at all. */
    const val NO_PERSONAL_TOKEN = "توکن خودت ثبت نشده — بدون توکن شخصی هیچ چیزی ثبت نمی‌شه ❌"

    fun synced(pulled: Int): String =
        if (pulled > 0) "بازخوانی شد ✅ ($pulled مورد از توکن پارتنر)" else "بازخوانی شد ✅"
}
