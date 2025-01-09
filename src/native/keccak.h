#ifndef _KECCAK_256_H_
#define _KECCAK_256_H_

#include <stddef.h> 
#include "ed25519/fixedint.h"
#include "util.h"

#define max_permutation_size 25
#define max_rate_in_qwords 24
#define KECCAK_FINALIZED 0x80000000
#define ROTL64(qword, n) ((qword) << (n) ^ ((qword) >> (64 - (n))))
#define le2me_64(x) (x)
#define IS_ALIGNED_64(p) (0 == (7 & ((long)(p))))
#define me64_to_le_str(to, from, length) memcpy((to), (from), (length))
#define I64(x) x##LL
#define NumberOfRounds 24

typedef struct KECCAK_CTX
{
	/* 1600 bits algorithm hashing state */
	uint64_t hash[max_permutation_size];
	/* 1536-bit buffer for leftovers */
	uint64_t message[max_rate_in_qwords];
	/* count of bytes in the message[] buffer */
	unsigned rest;
	/* size of a message block processed at once */
	unsigned block_size;
} KECCAK_CTX;

#define keccak256_update keccak_update
#define keccak256_final keccak_final
#define keccak512_update keccak_update
#define keccak512_final keccak_final

void keccak256_init(KECCAK_CTX *ctx);
void keccak256(const unsigned char* data, size_t len, unsigned char* digest);
void keccak512_init(KECCAK_CTX *ctx);
void keccak512(const unsigned char* data, size_t len, unsigned char* digest);

#endif // _KECCAK_256_H_
