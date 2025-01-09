#ifndef __KRYPTON_NATIVE_H
#define __KRYPTON_NATIVE_H

#include "argon2.h"
#include "blake2/blake2.h"
#include "sha256.h"
#include "sha512.h"

#define KRYPTON_ARGON2_SALT "kryptonrocks!"
#define KRYPTON_ARGON2_SALT_LEN 11
#define KRYPTON_DEFAULT_ARGON2_COST 512

int krypton_blake2(void *out, const void *in, const size_t inlen);
int krypton_argon2(void *out, const void *in, const size_t inlen, const uint32_t m_cost);
int krypton_kdf_legacy(void *out, const size_t outlen, const void *in, const size_t inlen, const void* seed, const size_t seedlen, const uint32_t m_cost, const uint32_t iter);
int krypton_kdf(void *out, const size_t outlen, const void *in, const size_t inlen, const void* seed, const size_t seedlen, const uint32_t m_cost, const uint32_t iter);
uint32_t krypton_argon2_target(void *out, void *in, const size_t inlen, const uint32_t compact, const uint32_t min_nonce, const uint32_t max_nonce, const uint32_t m_cost);
int krypton_argon2_verify(const void *hash, const void *in, const size_t inlen, const uint32_t m_cost);
void krypton_sha256(void *out, const void *in, const size_t inlen);
void krypton_sha512(void *out, const void *in, const size_t inlen);

#endif
