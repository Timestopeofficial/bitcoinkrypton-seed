/**
  * @file ripemd160.h
  * @brief RIPEMD-160 hash function
  *
  * @section License
  *
  * SPDX-License-Identifier: GPL-2.0-or-later
  *
  * Copyright (C) 2010-2023 Oryx Embedded SARL. All rights reserved.
  *
  * This file is part of CycloneCRYPTO Open.
  *
  * This program is free software; you can redistribute it and/or
  * modify it under the terms of the GNU General Public License
  * as published by the Free Software Foundation; either version 2
  * of the License, or (at your option) any later version.
  *
  * This program is distributed in the hope that it will be useful,
  * but WITHOUT ANY WARRANTY; without even the implied warranty of
  * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  * GNU General Public License for more details.
  *
  * You should have received a copy of the GNU General Public License
  * along with this program; if not, write to the Free Software Foundation,
  * Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA.
  *
  * @author Oryx Embedded SARL (www.oryx-embedded.com)
  * @version 2.2.4
  **/
  
#ifndef _RIPEMD160_H
#define _RIPEMD160_H
#include <stddef.h> 
#include <string.h>
#include "ed25519/fixedint.h"
#include "util.h"
//RIPEMD-160 block size
#define RIPEMD160_BLOCK_SIZE 64
//RIPEMD-160 digest size
#define RIPEMD160_DIGEST_SIZE 20
//Minimum length of the padding string
#define RIPEMD160_MIN_PAD_SIZE 9

//C++ guard
#ifdef __cplusplus
extern "C" {
#endif
  
  
/**
* @brief RIPEMD-160 algorithm context
**/
  
typedef struct
{
   union
   {
      uint32_t h[5];
      uint8_t digest[20];
   };
   union
   {
      uint32_t x[16];
      uint8_t buffer[64];
   };
   size_t size;
   uint64_t totalSize;
} Ripemd160Context;
  
//RIPEMD-160 related functions
int ripemd160(const unsigned char *data, size_t length, uint8_t *digest);
int ripemd160_init(Ripemd160Context *context);
int ripemd160_update(Ripemd160Context *context, const unsigned char *data, size_t length);
int ripemd160_final(Ripemd160Context *context, uint8_t *digest);
void ripemd160_compress(Ripemd160Context *context);
  
 //C++ guard
#ifdef __cplusplus
}
#endif
  
#endif
