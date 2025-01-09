
#if !defined(UINT128_MAX) && defined(__SIZEOF_INT128__)
SECP256K1_GNUC_EXT typedef unsigned __int128 uint128_t;
SECP256K1_GNUC_EXT typedef __int128 int128_t;
# define UINT128_MAX ((uint128_t)(-1))
# define INT128_MAX ((int128_t)(UINT128_MAX >> 1))
# define INT128_MIN (-INT128_MAX - 1)
/* No (U)INT128_C macros because compilers providing __int128 do not support 128-bit literals.  */
#endif

typedef uint128_t secp256k1_uint128;
typedef int128_t secp256k1_int128;

static SECP256K1_INLINE void secp256k1_u128_from_u64(secp256k1_uint128 *r, uint64_t a) {
  *r = a;
}

static SECP256K1_INLINE void secp256k1_u128_accum_u64(secp256k1_uint128 *r, uint64_t a) {
  *r += a;
}

static SECP256K1_INLINE uint64_t secp256k1_u128_to_u64(const secp256k1_uint128 *a) {
  return (uint64_t)(*a);
}

static SECP256K1_INLINE void secp256k1_u128_rshift(secp256k1_uint128 *r, unsigned int n) {
  *r >>= n;
}

static SECP256K1_INLINE void secp256k1_u128_mul(secp256k1_uint128 *r, uint64_t a, uint64_t b) {
  *r = (uint128_t)a * b;
}

static SECP256K1_INLINE void secp256k1_u128_accum_mul(secp256k1_uint128 *r, uint64_t a, uint64_t b) {
  *r += (uint128_t)a * b;
}

static SECP256K1_INLINE void secp256k1_i128_mul(secp256k1_int128 *r, int64_t a, int64_t b) {
  *r = (int128_t)a * b;
}

static SECP256K1_INLINE void secp256k1_i128_accum_mul(secp256k1_int128 *r, int64_t a, int64_t b) {
  int128_t ab = (int128_t)a * b;
  *r += ab;
}

static SECP256K1_INLINE uint64_t secp256k1_i128_to_u64(const secp256k1_int128 *a) {
  return (uint64_t)*a;
}

static SECP256K1_INLINE void secp256k1_i128_rshift(secp256k1_int128 *r, unsigned int n) {
  *r >>= n;
}

static SECP256K1_INLINE int64_t secp256k1_i128_to_i64(const secp256k1_int128 *a) {
  return *a;
}

static SECP256K1_INLINE uint64_t secp256k1_u128_hi_u64(const secp256k1_uint128 *a) {
  return (uint64_t)(*a >> 64);
}
