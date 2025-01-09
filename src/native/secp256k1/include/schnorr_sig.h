#include "secp256k1.h"

// static int secp256k1_schnorrsig_sign(const secp256k1_context* ctx, unsigned char *sig64, const unsigned char *msg, size_t msglen, const unsigned char *pub_r, const unsigned char *sec_k, const unsigned char *pubkey, const unsigned char *seckey);

int secp256k1_schnorrsig_sign(const secp256k1_context* ctx, unsigned char *sig64, unsigned char *msg, size_t msglen, const unsigned char *pubkey, const unsigned char *seckey);
int secp256k1_schnorrsig_verify(const secp256k1_context* ctx, const unsigned char *sig64, const unsigned char *msg, size_t msglen, const unsigned char *pubkey);

void secp256k1_schnorrsig_hash_pubkeys(unsigned char *out, const unsigned char *pubkeys, const size_t num_pubkey, size_t pubkey_size);
void secp256k1_schnorrsig_derive_delinearized_seckey(unsigned char *multisig_seckey, const unsigned char *pubkeys_hash, const unsigned char *pubkey, const unsigned char *seckey);
void secp256k1_schnorrsig_delinearize_pubkey(unsigned char *delinearized_pubkey, const unsigned char *pubkeys_hash, const unsigned char *pubkey, size_t pubkey_size);
int secp256k1_schnorrsig_aggregate_delinearized_publkeys(unsigned char *aggregate_pubkey, const unsigned char *pubkeys_hash, const unsigned char *pubkeys, const size_t num_pubkey, size_t pubkey_size);
int secp256k1_schnorrsig_partial_sign(const secp256k1_context* ctx, unsigned char *partial_signature, const unsigned char *msg, size_t msglen, const unsigned char* r, const unsigned char *k, const unsigned char *pubkeys, size_t num_cosigners, const unsigned char *pubkey, const unsigned char *seckey);

int secp256k1_schnorrsig_create_commitment(const secp256k1_context* ctx, unsigned char *k, unsigned char *r, size_t cmt_len, const unsigned char *randomness);
int secp256k1_schnorrsig_aggregate_commitments(unsigned char *aggregate_commitment, const unsigned char *commitments, const size_t num_commitments, size_t cmt_len);
int secp256k1_schnorrsig_add_scalars(unsigned char *scalar_AB, const unsigned char *scalar_A, const unsigned char *scalar_B);
