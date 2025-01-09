#ifndef _SECP256K1_NATIVE_H
#define _SECP256K1_NATIVE_H

#include <assert.h>
#include <stdlib.h>
#include "secp256k1/include/secp256k1.h"
#include "secp256k1/include/secp256k1_recovery.h"
#include "secp256k1/include/schnorr_sig.h"
#include "util.h"
static secp256k1_context *secp256k1_ctx = NULL;
const unsigned int PUBKEY_SIZE            = 65;
const unsigned int PUBKEY_COMPRESSED_SIZE = 33;
const unsigned int SIGNATURE_SIZE = 72;

void secp256k1_ctx_init(unsigned char *randomize);
void secp256k1_ctx_release();
int secp256k1_seckey_verify(const unsigned char *seckey);
void secp256k1_pubkey_create(unsigned char *output, size_t outputlen, const unsigned char *seckey);
int secp256k1_pubkey_verify(const unsigned char *pubkey);
int secp256k1_pubkey_compress(unsigned char *out_pubkey, const unsigned char *in_pubkey);
int secp256k1_pubkey_decompress(unsigned char *out_pubkey, const unsigned char *in_pubkey);
int sigHasLowR(const secp256k1_ecdsa_signature* sig);
int ecdsa_signature_parse_der_lax(secp256k1_ecdsa_signature* sig, const unsigned char *input, size_t inputlen);
unsigned int secp256k1_pubkey_get_length(const unsigned char chHeader);
int secp256k1_sign(unsigned char *output, const unsigned char *msghash32, const unsigned char *seckey);
int secp256k1_verify(const unsigned char *msghash32, const unsigned char *in_pubkey, const unsigned char *signature, const size_t signature_length);
int secp256k1_sign_compact(unsigned char *output, const unsigned char *msghash32, const unsigned char *seckey);
int secp256k1_sign_compact_verify(const unsigned char *msghash32, const unsigned char *in_pubkey, const unsigned char *signature64);

int secp256k1_schnorr_sign(unsigned char *sig64, unsigned char *msg, size_t msglen, const unsigned char *pubkey, const unsigned char *seckey);
int secp256k1_schnorr_verify(const unsigned char *sig64, const unsigned char *msg, size_t msglen, const unsigned char *pubkey);

void secp256k1_hash_pubkeys(unsigned char *out, const unsigned char *pubkeys, const size_t num_pubkey, size_t pubkey_size);
void secp256k1_derive_delinearized_seckey(unsigned char *multisig_seckey, const unsigned char *pubkeys_hash, const unsigned char *pubkey, const unsigned char *seckey);
void secp256k1_delinearize_pubkey(unsigned char *delinearized_pubkey, const unsigned char *pubkeys_hash, const unsigned char *pubkey, size_t pubkey_size);
int secp256k1_aggregate_delinearized_publkeys(unsigned char *aggregate_pubkey, const unsigned char *pubkeys_hash, const unsigned char *pubkeys, const size_t num_pubkey, size_t pubkey_size);
int secp256k1_partial_sign(unsigned char *partial_signature, const unsigned char *msg, size_t msglen, const unsigned char* r, const unsigned char *k, const unsigned char *pubkeys, size_t num_cosigners, const unsigned char *pubkey, const unsigned char *seckey);

int secp256k1_create_commitment(unsigned char *k, unsigned char *r, size_t cmt_len, const unsigned char *randomness);
int secp256k1_aggregate_commitments(unsigned char *aggregate_commitment, const unsigned char *commitments, const size_t num_commitments, size_t cmt_len);
int secp256k1_add_scalars(unsigned char *scalar_AB, const unsigned char *scalar_A, const unsigned char *scalar_B);

#endif // _SECP256K1_NATIVE_H
