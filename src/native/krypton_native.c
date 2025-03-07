#include <stdlib.h>
#include <string.h>
#include <stdio.h>
#include "krypton_native.h"
#include "endian.h"

typedef uint64_t* uint256;

uint256 uint256_new() {
    uint256 out = malloc(32);
    memset(out, 0, 32);
    return out;
}

void uint256_shift_left(uint256 value, uint8_t shift) {
    while (shift > 64) {
        for(int i = 0; i < 3; ++i) value[i] = value[i+1];
        value[3] = 0;
        shift -= 64;
    }
    if (shift == 0) return;
    for(int i = 0; i < 3; ++i) {
        value[i] <<= shift;
        value[i] |= value[i+1] >> (64-shift);
    }
    value[3] <<= shift;
    return;
}

void uint256_set(uint256 out, uint64_t value) {
    out[3] = value;
}

void uint256_set_compact(uint256 out, uint32_t compact) {
    uint256_set(out, compact & 0xffffff);
    uint256_shift_left(out, (8 * ((compact >> 24) - 3)));
}

void uint256_set_bytes(uint256 out, uint8_t* bytes) {
    uint64_t* in = (uint64_t*)bytes;
    for(int i = 0; i < 4; ++i) out[i] = htobe64(in[i]);
}

int8_t uint256_compare(uint256 left, uint256 right) {
    for(int i = 0; i < 4; ++i) {
        if (left[i] < right[i]) return -1;
        if (left[i] > right[i]) return 1;
    }
    return 0;
}

int krypton_blake2(void *out, const void *in, const size_t inlen) {
    return blake2b(out, 32, in, inlen, NULL, 0);
}

void krypton_sha256(void *out, const void *in, const size_t inlen) {
    SHA256_CTX ctx;
    sha256_init(&ctx);
    sha256_update(&ctx, in, inlen);
    sha256_final(&ctx, out);
}

void krypton_sha512(void *out, const void *in, const size_t inlen) {
    sha512_context ctx;
    sha512_init(&ctx);
    sha512_update(&ctx, in, inlen);
    sha512_final(&ctx, out);
}

inline int krypton_argon2_flags(void *out, const void *in, const size_t inlen, const uint32_t m_cost, const uint32_t flags) {
    return argon2d_hash_raw_flags(1, m_cost == 0 ? KRYPTON_DEFAULT_ARGON2_COST : m_cost, 1, in, inlen, KRYPTON_ARGON2_SALT, KRYPTON_ARGON2_SALT_LEN, out, 32, flags);
}

int krypton_argon2(void *out, const void *in, const size_t inlen, const uint32_t m_cost) {
    return krypton_argon2_flags(out, in, inlen, m_cost, ARGON2_DEFAULT_FLAGS);
}

int krypton_argon2_no_wipe(void *out, const void *in, const size_t inlen, const uint32_t m_cost) {
    return krypton_argon2_flags(out, in, inlen, m_cost, ARGON2_DEFAULT_FLAGS | ARGON2_FLAG_NO_WIPE);
}

int krypton_kdf_legacy(void *out, const size_t outlen, const void *in, const size_t inlen, const void* seed, const size_t seedlen, const uint32_t m_cost, const uint32_t iter) {
    int ret;
    uint32_t i;
    ret = argon2d_hash_raw(1, m_cost == 0 ? KRYPTON_DEFAULT_ARGON2_COST : m_cost, 1, in, inlen, seed, seedlen, out, outlen);
    if (ret != ARGON2_OK) return ret;
    for(i = 0; i < iter; ++i) {
        ret = argon2d_hash_raw(1, m_cost == 0 ? KRYPTON_DEFAULT_ARGON2_COST : m_cost, 1, out, outlen, seed, seedlen, out, outlen);
        if (ret != ARGON2_OK) return ret;
    }
    return ARGON2_OK;
}

int krypton_kdf(void *out, const size_t outlen, const void *in, const size_t inlen, const void* seed, const size_t seedlen, const uint32_t m_cost, const uint32_t iter) {
    return argon2d_hash_raw(iter, m_cost == 0 ? KRYPTON_DEFAULT_ARGON2_COST : m_cost, 1, in, inlen, seed, seedlen, out, outlen);
}

uint32_t krypton_argon2_target(void *out, void *in, const size_t inlen, const uint32_t compact, const uint32_t min_nonce, const uint32_t max_nonce, const uint32_t m_cost) {
    uint32_t* noncer = (uint32_t*)(((uint8_t*)in)+inlen-4);
    uint256 target = uint256_new(), hash = uint256_new();
    uint256_set_compact(target, compact);
    for(noncer[0] = htobe32(min_nonce); be32toh(noncer[0]) < max_nonce; noncer[0] = htobe32(be32toh(noncer[0])+1)) {
        krypton_argon2_no_wipe(out, in, inlen, m_cost);
        uint256_set_bytes(hash, out);
        if (uint256_compare(target, hash) > 0) {
            break;
        }
    }
    free(hash);
    free(target);
    return be32toh(noncer[0]);
}

int krypton_argon2_verify(const void *hash, const void *in, const size_t inlen, const uint32_t m_cost) {
    void* out = malloc(32);
    krypton_argon2(out, in, inlen, m_cost);
    int res = memcmp(hash, out, 32);
    free(out);
    return res;
}

