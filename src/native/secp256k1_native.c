#include "secp256k1_native.h"

void secp256k1_ctx_release() {
    secp256k1_context *ctx = secp256k1_ctx;
    secp256k1_ctx = NULL;

    if (ctx) {
        secp256k1_context_destroy(ctx);
    }
}

void secp256k1_ctx_init(unsigned char *randomize) {
    secp256k1_context *ctx = secp256k1_context_create(SECP256K1_CONTEXT_NONE);
    /* Randomizing the context is recommended to protect against side-channel
        * leakage See `secp256k1_context_randomize` in secp256k1.h for more
        * information about it. This should never fail. */
    int ret = secp256k1_context_randomize(ctx, randomize);
    assert(ret);
    secp256k1_ctx = ctx;
}

int secp256k1_seckey_verify(const unsigned char *seckey) {
    return secp256k1_ec_seckey_verify(secp256k1_ctx, seckey);
}

void secp256k1_pubkey_create(unsigned char *output, size_t outputlen, const unsigned char *seckey) {
    secp256k1_pubkey pubkey;
    int ret = secp256k1_ec_pubkey_create(secp256k1_ctx, &pubkey, seckey);
    assert(ret);
    unsigned int flags = outputlen == PUBKEY_COMPRESSED_SIZE ? SECP256K1_EC_COMPRESSED : SECP256K1_EC_UNCOMPRESSED;
    secp256k1_ec_pubkey_serialize(secp256k1_ctx, output, &outputlen, &pubkey, flags);
}

int secp256k1_pubkey_verify(const unsigned char *pubkey) {
    secp256k1_pubkey pub;
    return secp256k1_ec_pubkey_parse(secp256k1_ctx, &pub, pubkey, secp256k1_pubkey_get_length(pubkey[0]));
}

int secp256k1_pubkey_compress(unsigned char *out_pubkey, const unsigned char *in_pubkey) {
    secp256k1_pubkey pubkey;
    if (!secp256k1_ec_pubkey_parse(secp256k1_ctx, &pubkey, in_pubkey, secp256k1_pubkey_get_length(*in_pubkey))) {
        return 0;
    }
    
    size_t publen = PUBKEY_COMPRESSED_SIZE;
    unsigned char* pub = malloc(publen);
    secp256k1_ec_pubkey_serialize(secp256k1_ctx, pub, &publen, &pubkey, SECP256K1_EC_COMPRESSED);
    memcpy(out_pubkey, pub, publen);
    free(pub);
    return 1;
}

int secp256k1_pubkey_decompress(unsigned char *out_pubkey, const unsigned char *in_pubkey) {
    secp256k1_pubkey pubkey;
    if (!secp256k1_ec_pubkey_parse(secp256k1_ctx, &pubkey, in_pubkey, secp256k1_pubkey_get_length(*in_pubkey))) {
        return 0;
    }
    
    size_t publen = PUBKEY_SIZE;
    unsigned char* pub = malloc(publen);
    secp256k1_ec_pubkey_serialize(secp256k1_ctx, pub, &publen, &pubkey, SECP256K1_EC_UNCOMPRESSED);
    memcpy(out_pubkey, pub, publen);
    free(pub);
    return 1;
}

// Check that the sig has a low R value and will be less than 71 bytes
int sigHasLowR(const secp256k1_ecdsa_signature* sig) {
    unsigned char compact_sig[64];
    secp256k1_ecdsa_signature_serialize_compact(secp256k1_ctx, compact_sig, sig);

    // In DER serialization, all values are interpreted as big-endian, signed integers. The highest bit in the integer indicates
    // its signed-ness; 0 is positive, 1 is negative. When the value is interpreted as a negative integer, it must be converted
    // to a positive value by prepending a 0x00 byte so that the highest bit is 0. We can avoid this prepending by ensuring that
    // our highest bit is always 0, and thus we must check that the first byte is less than 0x80.
    return compact_sig[0] < 0x80;
}

int ecdsa_signature_parse_der_lax(secp256k1_ecdsa_signature* sig, const unsigned char *input, size_t inputlen) {
    size_t rpos, rlen, spos, slen;
    size_t pos = 0;
    size_t lenbyte;
    unsigned char tmpsig[64] = {0};
    int overflow = 0;

    /* Hack to initialize sig with a correctly-parsed but invalid signature. */
    secp256k1_ecdsa_signature_parse_compact(secp256k1_context_static, sig, tmpsig);

    /* Sequence tag byte */
    if (pos == inputlen || input[pos] != 0x30) {
        return 0;
    }
    pos++;

    /* Sequence length bytes */
    if (pos == inputlen) {
        return 0;
    }
    lenbyte = input[pos++];
    if (lenbyte & 0x80) {
        lenbyte -= 0x80;
        if (lenbyte > inputlen - pos) {
            return 0;
        }
        pos += lenbyte;
    }

    /* Integer tag byte for R */
    if (pos == inputlen || input[pos] != 0x02) {
        return 0;
    }
    pos++;

    /* Integer length for R */
    if (pos == inputlen) {
        return 0;
    }
    lenbyte = input[pos++];
    if (lenbyte & 0x80) {
        lenbyte -= 0x80;
        if (lenbyte > inputlen - pos) {
            return 0;
        }
        while (lenbyte > 0 && input[pos] == 0) {
            pos++;
            lenbyte--;
        }
        static_assert(sizeof(size_t) >= 4, "size_t too small");
        if (lenbyte >= 4) {
            return 0;
        }
        rlen = 0;
        while (lenbyte > 0) {
            rlen = (rlen << 8) + input[pos];
            pos++;
            lenbyte--;
        }
    } else {
        rlen = lenbyte;
    }
    if (rlen > inputlen - pos) {
        return 0;
    }
    rpos = pos;
    pos += rlen;

    /* Integer tag byte for S */
    if (pos == inputlen || input[pos] != 0x02) {
        return 0;
    }
    pos++;

    /* Integer length for S */
    if (pos == inputlen) {
        return 0;
    }
    lenbyte = input[pos++];
    if (lenbyte & 0x80) {
        lenbyte -= 0x80;
        if (lenbyte > inputlen - pos) {
            return 0;
        }
        while (lenbyte > 0 && input[pos] == 0) {
            pos++;
            lenbyte--;
        }
        static_assert(sizeof(size_t) >= 4, "size_t too small");
        if (lenbyte >= 4) {
            return 0;
        }
        slen = 0;
        while (lenbyte > 0) {
            slen = (slen << 8) + input[pos];
            pos++;
            lenbyte--;
        }
    } else {
        slen = lenbyte;
    }
    if (slen > inputlen - pos) {
        return 0;
    }
    spos = pos;

    /* Ignore leading zeroes in R */
    while (rlen > 0 && input[rpos] == 0) {
        rlen--;
        rpos++;
    }
    /* Copy R value */
    if (rlen > 32) {
        overflow = 1;
    } else {
        memcpy(tmpsig + 32 - rlen, input + rpos, rlen);
    }

    /* Ignore leading zeroes in S */
    while (slen > 0 && input[spos] == 0) {
        slen--;
        spos++;
    }
    /* Copy S value */
    if (slen > 32) {
        overflow = 1;
    } else {
        memcpy(tmpsig + 64 - slen, input + spos, slen);
    }

    if (!overflow) {
        overflow = !secp256k1_ecdsa_signature_parse_compact(secp256k1_context_static, sig, tmpsig);
    }
    if (overflow) {
        /* Overwrite the result again with a correctly-parsed but invalid
           signature if parsing failed. */
        memset(tmpsig, 0, 64);
        secp256k1_ecdsa_signature_parse_compact(secp256k1_context_static, sig, tmpsig);
    }
    return 1;
}

//! Compute the length of a pubkey with a given first byte.
unsigned int secp256k1_pubkey_get_length(const unsigned char chHeader) {
    if (chHeader == 2 || chHeader == 3)
        return PUBKEY_COMPRESSED_SIZE;
    if (chHeader == 4 || chHeader == 6 || chHeader == 7)
        return PUBKEY_SIZE;
    return 0;
}

int secp256k1_sign(unsigned char *output, const unsigned char *msghash32, const unsigned char *seckey) {
    size_t nSigLen = SIGNATURE_SIZE;
    unsigned char* vchSig = malloc(nSigLen);
    secp256k1_ecdsa_signature sig;
    int ret = secp256k1_ecdsa_sign(secp256k1_ctx, &sig, msghash32, seckey, secp256k1_nonce_function_rfc6979, NULL);
    // Grind for low R
    unsigned int counter = 0;
    unsigned char extra_entropy[32] = {0};
    while (ret && !sigHasLowR(&sig)) {
        WriteLE32(extra_entropy, ++counter);
        ret = secp256k1_ecdsa_sign(secp256k1_ctx, &sig, msghash32, seckey, secp256k1_nonce_function_rfc6979, extra_entropy);
    }
    secp256k1_ecdsa_signature_serialize_der(secp256k1_ctx, vchSig, &nSigLen, &sig);
    memcpy(output, vchSig, nSigLen);
    free(vchSig);
    return nSigLen;
}

int secp256k1_verify(const unsigned char *msghash32, const unsigned char *in_pubkey, const unsigned char *signature, const size_t signature_length) {
    secp256k1_pubkey pubkey;
    secp256k1_ecdsa_signature sig;
    if (!secp256k1_ec_pubkey_parse(secp256k1_ctx, &pubkey, in_pubkey, secp256k1_pubkey_get_length(*in_pubkey))) return 0;
    if (!ecdsa_signature_parse_der_lax(&sig, signature, signature_length)) return 0;
    /* libsecp256k1's ECDSA verification requires lower-S signatures, which have
        * not historically been enforced in Bitcoin, so normalize them first. */
    secp256k1_ecdsa_signature_normalize(secp256k1_ctx, &sig, &sig);

    return secp256k1_ecdsa_verify(secp256k1_ctx, &sig, msghash32, &pubkey);
}

int secp256k1_sign_compact(unsigned char *output, const unsigned char *msghash32, const unsigned char *seckey) {
    secp256k1_ecdsa_recoverable_signature sig;
    if (!secp256k1_ecdsa_sign_recoverable(secp256k1_ctx, &sig, msghash32, seckey, secp256k1_nonce_function_rfc6979, NULL)) return 0;
    int recid;
    return secp256k1_ecdsa_recoverable_signature_serialize_compact(secp256k1_ctx, output, &recid, &sig);
}

int secp256k1_sign_compact_verify(const unsigned char *msghash32, const unsigned char *in_pubkey, const unsigned char *signature64) {
    secp256k1_ecdsa_signature sig;
    if (!secp256k1_ecdsa_signature_parse_compact(secp256k1_ctx, &sig, signature64)) return 0;
    secp256k1_pubkey pubkey;
    if (!secp256k1_ec_pubkey_parse(secp256k1_ctx, &pubkey, in_pubkey, secp256k1_pubkey_get_length(*in_pubkey))) return 0;
    /* libsecp256k1's ECDSA verification requires lower-S signatures, which have
        * not historically been enforced in Bitcoin, so normalize them first. */
    secp256k1_ecdsa_signature_normalize(secp256k1_ctx, &sig, &sig);
    return secp256k1_ecdsa_verify(secp256k1_ctx, &sig, msghash32, &pubkey);
}

int secp256k1_schnorr_sign(unsigned char *sig64, unsigned char *msg, size_t msglen, const unsigned char *pubkey, const unsigned char *seckey) {
    return secp256k1_schnorrsig_sign(secp256k1_ctx, sig64, msg, msglen, pubkey, seckey);
}
int secp256k1_schnorr_verify(const unsigned char *sig64, const unsigned char *msg, size_t msglen, const unsigned char *pubkey) {
  return secp256k1_schnorrsig_verify(secp256k1_ctx, sig64, msg, msglen, pubkey);
}

void secp256k1_hash_pubkeys(unsigned char *out, const unsigned char *pubkeys, const size_t num_pubkey, size_t pubkey_size) {
    secp256k1_schnorrsig_hash_pubkeys(out, pubkeys, num_pubkey, pubkey_size);
}

void secp256k1_derive_delinearized_seckey(unsigned char *multisig_seckey, const unsigned char *pubkeys_hash, const unsigned char *pubkey, const unsigned char *seckey) {
    secp256k1_schnorrsig_derive_delinearized_seckey(multisig_seckey, pubkeys_hash, pubkey, seckey);
}

void secp256k1_delinearize_pubkey(unsigned char *delinearized_pubkey, const unsigned char *pubkeys_hash, const unsigned char *pubkey, size_t pubkey_size) {
    secp256k1_schnorrsig_delinearize_pubkey(delinearized_pubkey, pubkeys_hash, pubkey, pubkey_size);
}
int secp256k1_aggregate_delinearized_publkeys(unsigned char *aggregate_pubkey, const unsigned char *pubkeys_hash, const unsigned char *pubkeys, const size_t num_pubkey, size_t pubkey_size) {
    return secp256k1_schnorrsig_aggregate_delinearized_publkeys(aggregate_pubkey, pubkeys_hash, pubkeys, num_pubkey, pubkey_size);
}
int secp256k1_partial_sign(unsigned char *partial_signature, const unsigned char *msg, size_t msglen, const unsigned char* r, const unsigned char *k, const unsigned char *pubkeys, size_t num_cosigners, const unsigned char *pubkey, const unsigned char *seckey) {
    return secp256k1_schnorrsig_partial_sign(secp256k1_ctx, partial_signature, msg, msglen, r, k, pubkeys, num_cosigners, pubkey, seckey);
}

int secp256k1_create_commitment(unsigned char *k, unsigned char *r, size_t cmt_len, const unsigned char *randomness) {
    return secp256k1_schnorrsig_create_commitment(secp256k1_ctx, k, r, cmt_len, randomness);
}
int secp256k1_aggregate_commitments(unsigned char *aggregate_commitment, const unsigned char *commitments, const size_t num_commitments, size_t cmt_len) {
    return secp256k1_schnorrsig_aggregate_commitments(aggregate_commitment, commitments, num_commitments, cmt_len);
}
int secp256k1_add_scalars(unsigned char *scalar_AB, const unsigned char *scalar_A, const unsigned char *scalar_B) {
    return secp256k1_schnorrsig_add_scalars(scalar_AB, scalar_A, scalar_B);
}

