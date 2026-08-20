package com.coupleos.app.domain.model

enum class PersonRole {
    PERSON_A,
    PERSON_B;

    companion object {
        fun fromString(value: String): PersonRole = when (value.uppercase()) {
            "PERSON_A", "A" -> PERSON_A
            "PERSON_B", "B" -> PERSON_B
            else -> throw IllegalArgumentException("Invalid person role: $value")
        }
    }
}
