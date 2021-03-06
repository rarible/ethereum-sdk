import type { CryptoPunkOrder, LegacyOrder, OpenSeaV1Order, RaribleV2Order } from "@rarible/ethereum-api-client"
import type { SeaportV1Order } from "@rarible/ethereum-api-client/build/models/Order"

export type SimpleLegacyOrder =
	Pick<LegacyOrder, "data" | "maker" | "taker" | "make" | "take" | "salt" | "start" | "end" | "type" | "signature">

export type SimpleRaribleV2Order =
	Pick<RaribleV2Order, "data" | "maker" | "taker" | "make" | "take" | "salt" | "start" | "end" | "type" | "signature">

export type SimpleOpenSeaV1Order =
	Pick<OpenSeaV1Order, "data" | "maker" | "taker" | "make" | "take" | "salt" | "start" | "end" | "type" | "signature">

export type SimpleCryptoPunkOrder =
	Pick<CryptoPunkOrder, "data" | "maker" | "taker" | "make" | "take" | "salt" | "start" | "end" | "type" | "signature">

export type SimpleSeaportV1Order =
	Pick<SeaportV1Order, "data" | "maker" | "taker" | "make" | "take" | "salt" | "start" | "end" | "type" | "signature">

export type SimpleOrder =
	SimpleLegacyOrder |
	SimpleRaribleV2Order |
	SimpleOpenSeaV1Order |
	SimpleCryptoPunkOrder |
	SimpleSeaportV1Order

export type UpsertSimpleOrder =
	SimpleLegacyOrder |
	SimpleRaribleV2Order
