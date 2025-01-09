#include "include/schnorr_sig.h"

int secp256k1_schnorrsig_derive_pubkey(const secp256k1_context* ctx, unsigned char *output, size_t outputlen, const unsigned char *seckey) {
  secp256k1_pubkey pubkey;
  int ret = secp256k1_ec_pubkey_create(ctx, &pubkey, seckey);
  unsigned int flags = outputlen == 33 ? SECP256K1_EC_COMPRESSED : SECP256K1_EC_UNCOMPRESSED;
  ret &= secp256k1_ec_pubkey_serialize(ctx, output, &outputlen, &pubkey, flags);

  return ret;
}

static void secp256k1_schnorrsig_challenge(secp256k1_scalar* e, const unsigned char *r32, const unsigned char *msg, size_t msglen, const unsigned char *pubkey32)
{
  unsigned char buf[32];
  secp256k1_sha256 ctx;

  /* tagged hash(r.x, pk.x, msg) */
  secp256k1_sha256_initialize(&ctx);
  secp256k1_sha256_write(&ctx, r32, 32);
  secp256k1_sha256_write(&ctx, pubkey32, 32);
  secp256k1_sha256_write(&ctx, msg, msglen);
  secp256k1_sha256_finalize(&ctx, buf);
  
  /* Set scalar e to the challenge hash modulo the curve order as per
    * BIP340. */

  secp256k1_scalar_set_b32(e, buf, NULL);
}

static int secp256k1_schnorrsig_create_sign(const secp256k1_context* ctx, unsigned char *sig64, const unsigned char *msg, size_t msglen, const unsigned char *pub_r, const unsigned char *sec_k, const unsigned char *pubkey, const unsigned char *seckey) {
  secp256k1_scalar sk;
  secp256k1_scalar e;
  secp256k1_scalar k;
  secp256k1_ge pk;
  secp256k1_ge r;
  unsigned char pk_buf[32];

  ARG_CHECK(secp256k1_ecmult_gen_context_is_built(&ctx->ecmult_gen_ctx));
  ARG_CHECK(sig64 != NULL);
  ARG_CHECK(msg != NULL || msglen == 0);

  int ret = 1;
  ret &= secp256k1_scalar_set_b32_seckey(&sk, seckey);
  ret &= secp256k1_eckey_pubkey_parse(&pk, pubkey, 33u);
  /* Because we are signing for a x-only pubkey, the secret key is negated
    * before signing if the point corresponding to the secret key does not
    * have an even Y. */
  secp256k1_fe_normalize_var(&pk.x);
  secp256k1_fe_normalize_var(&pk.y);
  if (secp256k1_fe_is_odd(&pk.y)) {
    secp256k1_scalar_negate(&sk, &sk);
  }
  secp256k1_fe_get_b32(pk_buf, &pk.x);

  ret &= secp256k1_scalar_set_b32_seckey(&k, sec_k);
  ret &= secp256k1_eckey_pubkey_parse(&r, pub_r, 33u);
  
  secp256k1_fe_normalize_var(&r.x);
  secp256k1_fe_normalize_var(&r.y);
  if (secp256k1_fe_is_odd(&r.y)) {
    secp256k1_scalar_negate(&k, &k);
  }
  secp256k1_fe_get_b32(&sig64[0], &r.x);

  secp256k1_schnorrsig_challenge(&e, &sig64[0], msg, msglen, pk_buf);
  secp256k1_scalar_mul(&e, &e, &sk);
  secp256k1_scalar_add(&e, &e, &k);
  secp256k1_scalar_get_b32(&sig64[32], &e);

  secp256k1_memczero(sig64, 64, !ret);
  secp256k1_scalar_clear(&k);
  secp256k1_scalar_clear(&sk);
  memset((void *)seckey, 0, sizeof(seckey));

  return ret;
}

int secp256k1_schnorrsig_verify(const secp256k1_context* ctx, const unsigned char *sig64, const unsigned char *msg, size_t msglen, const unsigned char *pubkey) {
  secp256k1_scalar s;
  secp256k1_scalar e;
  secp256k1_gej rj;
  secp256k1_ge pk;
  secp256k1_gej pkj;
  secp256k1_fe rx;
  secp256k1_ge r;
  unsigned char buf[32];
  int overflow;

  ARG_CHECK(sig64 != NULL);
  ARG_CHECK(msg != NULL || msglen == 0);
  ARG_CHECK(pubkey != NULL);

  if (!secp256k1_fe_set_b32(&rx, &sig64[0])) {
    return 0;
  }

  secp256k1_scalar_set_b32(&s, &sig64[32], &overflow);
  if (overflow) {
    return 0;
  }

  if (!secp256k1_eckey_pubkey_parse(&pk, pubkey, 33u)) {
    return 0;
  }

  /* Compute e. */
  secp256k1_fe_normalize_var(&pk.x);
  secp256k1_fe_normalize_var(&pk.y);
  secp256k1_fe_get_b32(buf, &pk.x);
  secp256k1_schnorrsig_challenge(&e, &sig64[0], msg, msglen, buf);

  /* Compute rj =  s*G - e*pkj if pk.y is even */
  /* Compute rj =  s*G + e*pkj if pk.y is odd */
  if (!secp256k1_fe_is_odd(&pk.y)) {
    secp256k1_scalar_negate(&e, &e);
  }
  secp256k1_gej_set_ge(&pkj, &pk);
  secp256k1_ecmult(&rj, &pkj, &e, &s);

  secp256k1_ge_set_gej_var(&r, &rj);
  if (secp256k1_ge_is_infinity(&r)) {
    return 0;
  }

  secp256k1_fe_normalize_var(&r.y);
  return !secp256k1_fe_is_odd(&r.y) && secp256k1_fe_equal_var(&rx, &r.x);
}

int secp256k1_schnorrsig_sign(const secp256k1_context *ctx, unsigned char *sig64, unsigned char *msg, size_t msglen, const unsigned char *pubkey, const unsigned char *seckey) {
  ARG_CHECK(pubkey != NULL);
  ARG_CHECK(seckey != NULL);
  ARG_CHECK(sig64 != NULL);
  ARG_CHECK(msg != NULL || msglen == 0);

  secp256k1_scalar sk;
  secp256k1_ge pk;
  unsigned char sk_buf[32];
  unsigned char pk_buf[32];
  unsigned char kbuf[32] = { 0 };
  unsigned char rbuf[33];

  int ret = 1;
  ret &= secp256k1_eckey_pubkey_parse(&pk, pubkey, 33u);
  ret &= secp256k1_scalar_set_b32_seckey(&sk, seckey);
  if (secp256k1_fe_is_odd(&pk.y)) {
    secp256k1_scalar_negate(&sk, &sk);
  }
  secp256k1_scalar_get_b32(sk_buf, &sk);
  secp256k1_fe_get_b32(pk_buf, &pk.x);

  // create commitment pair
  unsigned char rand[32];
  random_buffer(rand, 32);
  secp256k1_sha256 sha;
  secp256k1_sha256_initialize(&sha);
  secp256k1_sha256_write(&sha, rand, 32);
  secp256k1_sha256_write(&sha, msg, msglen);
  secp256k1_sha256_write(&sha, sk_buf, 32);
  secp256k1_sha256_write(&sha, pk_buf, 32);
  secp256k1_sha256_finalize(&sha, kbuf);
  secp256k1_schnorrsig_derive_pubkey(ctx, rbuf, 33, kbuf);

  // sign
  ret &= secp256k1_schnorrsig_create_sign(ctx, sig64, msg, msglen, rbuf, kbuf, pubkey, seckey);

  secp256k1_scalar_clear(&sk);
  memset(sk_buf, 0, sizeof(sk_buf));
  
  return ret;
}

/*
 * Derives H(P_1 || ... || P_n).
 */

void secp256k1_schnorrsig_hash_pubkeys(unsigned char *out, const unsigned char *pubkeys, const size_t num_pubkey, size_t pubkey_size) {
  size_t size = num_pubkey * 32;
  unsigned char* buf = malloc(size);

  for (size_t i = 0; i < num_pubkey; i++) {
    memcpy(buf + (i * 32), pubkeys + (i * pubkey_size) + 1, 32); // x-only public
  }
  secp256k1_sha256 hash;
  secp256k1_sha256_initialize(&hash);
  secp256k1_sha256_write(&hash, buf, size);
  secp256k1_sha256_finalize(&hash, out);
  free(buf);
}

/*
 * Let pubkeys_hash = C = H(P_1 || ... || P_n).
 * Derives a multisig seckey = H(C||P)x used for multisignatures where x is seckey.
 */

void secp256k1_schnorrsig_derive_delinearized_seckey(unsigned char *multisig_seckey, const unsigned char *pubkeys_hash, const unsigned char *pubkey, const unsigned char *seckey) {
  secp256k1_scalar sk;
  secp256k1_scalar buf;

  // Compute H(C||P).
  unsigned char pH[32];
  secp256k1_sha256 hash;
  secp256k1_sha256_initialize(&hash);
  secp256k1_sha256_write(&hash, pubkeys_hash, 32);
  secp256k1_sha256_write(&hash, pubkey + 1, 32); // x-only pubkey
  secp256k1_sha256_finalize(&hash, pH);

  // Compute H(C||P)x.
  secp256k1_scalar_set_b32_seckey(&sk, seckey);
  secp256k1_scalar_set_b32(&buf, pH, NULL);
  secp256k1_scalar_mul(&sk, &buf, &sk);
  secp256k1_scalar_get_b32(multisig_seckey, &sk);

  secp256k1_scalar_clear(&sk);
}

/*
 * Let pubkeys_hash = C = H(P_1 || ... || P_n).
 * Delinearizes a public key P' = H(C || P) P.
 */

void secp256k1_schnorrsig_delinearize_pubkey_ge(secp256k1_ge *delinearized_pubkey, const unsigned char *pubkeys_hash, const unsigned char *pubkey, size_t pubkey_size) {
  secp256k1_scalar buf;

  // Compute H(C||P).
  unsigned char pH[32];
  secp256k1_sha256 hash;
  secp256k1_sha256_initialize(&hash);
  secp256k1_sha256_write(&hash, pubkeys_hash, 32);
  secp256k1_sha256_write(&hash, pubkey + 1, 32); // x-only public key
  secp256k1_sha256_finalize(&hash, pH);

  // Compute H(C||P)P.
  secp256k1_scalar_set_b32(&buf, pH, NULL);
  secp256k1_eckey_pubkey_parse(delinearized_pubkey, pubkey, pubkey_size);
  secp256k1_eckey_pubkey_tweak_mul(delinearized_pubkey, &buf);
}

void secp256k1_schnorrsig_delinearize_pubkey(unsigned char *delinearized_pubkey, const unsigned char *pubkeys_hash, const unsigned char *pubkey, size_t pubkey_size) {
  secp256k1_ge pk;
  int compressed = pubkey_size == 33 ? 1 : 0;
  secp256k1_schnorrsig_delinearize_pubkey_ge(&pk, pubkeys_hash, pubkey, pubkey_size);
  secp256k1_eckey_pubkey_serialize(&pk, delinearized_pubkey, &pubkey_size, compressed);
}

/*
 * Let C = pubkeys_hash = H(P_1 || ... || P_n).
 * Aggregates a set of public keys P_1, ..., P_n to P = ∑ H(C || P_i) P_i.
 */

int secp256k1_schnorrsig_aggregate_delinearized_publkeys(unsigned char *aggregate_pubkey, const unsigned char *pubkeys_hash, const unsigned char *pubkeys, const size_t num_pubkey, size_t pubkey_size) {
  secp256k1_gej Qj;
  secp256k1_ge Q;

  secp256k1_gej_set_infinity(&Qj);
  for (size_t i = 0; i < num_pubkey; ++i) {
    const unsigned char *pubkey = pubkeys + (i * pubkey_size);
    secp256k1_schnorrsig_delinearize_pubkey_ge(&Q, pubkeys_hash, pubkey, pubkey_size);
    secp256k1_gej_add_ge(&Qj, &Qj, &Q);
  }
  if (secp256k1_gej_is_infinity(&Qj)) {
    return 0;
  }
  /* pack point */
  secp256k1_ge_set_gej(&Q, &Qj);
  int compressed = pubkey_size == 33u ? 1 : 0;
  secp256k1_eckey_pubkey_serialize(&Q, aggregate_pubkey, &pubkey_size, compressed);
  return 1;
}

int secp256k1_schnorrsig_partial_sign(const secp256k1_context *ctx, unsigned char *sig64, const unsigned char *msg, size_t msglen, const unsigned char *r, const unsigned char *k, const unsigned char *pubkeys, size_t num_cosigners, const unsigned char *pubkey, const unsigned char *seckey) {
  ARG_CHECK(sig64 != NULL);
  ARG_CHECK(msg != NULL || msglen == 0);
  ARG_CHECK(r != NULL);
  ARG_CHECK(k != NULL);
  ARG_CHECK(pubkeys != NULL);
  ARG_CHECK(pubkey != NULL);
  ARG_CHECK(seckey != NULL);

  unsigned char pubkeys_hash[32];
  unsigned char delinearized_seckey[32];
  unsigned char delinearized_pubkey[33];
  int ret = 1;
  secp256k1_schnorrsig_hash_pubkeys(pubkeys_hash, pubkeys, num_cosigners, 33);
  secp256k1_schnorrsig_derive_delinearized_seckey(delinearized_seckey, pubkeys_hash, pubkey, seckey);
  ret &= secp256k1_schnorrsig_aggregate_delinearized_publkeys(delinearized_pubkey, pubkeys_hash, pubkeys, num_cosigners, 33u);
  ret &= secp256k1_schnorrsig_create_sign(ctx, sig64, msg, msglen, r, k, delinearized_pubkey, delinearized_seckey);

  return ret;
}

int secp256k1_schnorrsig_create_commitment(const secp256k1_context* ctx, unsigned char *k, unsigned char *r, size_t cmt_len, const unsigned char *randomness) {
  secp256k1_sha256 hash;
  secp256k1_sha256_initialize(&hash);
  secp256k1_sha256_write(&hash, randomness, 32);
  secp256k1_sha256_finalize(&hash, k);

  return secp256k1_schnorrsig_derive_pubkey(ctx, r, cmt_len, k);
}

/*
 * Aggregates a set of commitments.
 */

int secp256k1_schnorrsig_aggregate_commitments(unsigned char *aggregate_commitment, const unsigned char *commitments, const size_t num_commitments, size_t cmt_len) {
  secp256k1_ge Q;
  secp256k1_gej Qj;

  secp256k1_gej_set_infinity(&Qj);
  for (size_t i = 0; i < num_commitments; ++i) {
    const unsigned char *commitment = commitments + (i * cmt_len);
    secp256k1_eckey_pubkey_parse(&Q, commitment, cmt_len);
    /* sum = sum + commitment */
    secp256k1_gej_add_ge(&Qj, &Qj, &Q);
  }
  if (secp256k1_gej_is_infinity(&Qj)) {
    return 0;
  }
  /* pack point */
  secp256k1_ge_set_gej(&Q, &Qj);
  int compressed = cmt_len == 33u ? 1 : 0;
  return secp256k1_eckey_pubkey_serialize(&Q, aggregate_commitment, &cmt_len, compressed);
}

int secp256k1_schnorrsig_add_scalars(unsigned char *scalar_AB, const unsigned char *scalar_A, const unsigned char *scalar_B) {
  secp256k1_scalar ab;
  secp256k1_scalar a;
  secp256k1_scalar b;

  int ret = secp256k1_scalar_set_b32_seckey(&a, scalar_A);
  ret &= secp256k1_scalar_set_b32_seckey(&b, scalar_B);

  secp256k1_scalar_add(&ab, &a, &b);
  ret &= !secp256k1_scalar_is_zero(&ab);
  secp256k1_scalar_cmov(&ab, &secp256k1_scalar_zero, !ret);
  secp256k1_scalar_get_b32(scalar_AB, &ab);

  secp256k1_scalar_clear(&a);
  secp256k1_scalar_clear(&b);
  secp256k1_scalar_clear(&ab);

  return ret;
}
