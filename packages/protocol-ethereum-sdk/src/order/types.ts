import { LegacyOrder, OpenSeaV1Order, RaribleV2Order } from "@rarible/protocol-api-client"

export type SimpleLegacyOrder =
	Pick<LegacyOrder, "data" | "maker" | "taker" | "make" | "take" | "salt" | "start" | "end" | "type" | "signature">

export type SimpleRaribleV2Order =
	Pick<RaribleV2Order, "data" | "maker" | "taker" | "make" | "take" | "salt" | "start" | "end" | "type" | "signature">

export type SimpleOpenSeaV1Order =
	Pick<OpenSeaV1Order, "data" | "maker" | "taker" | "make" | "take" | "salt" | "start" | "end" | "type" | "signature">

export type SimpleOrder =
	SimpleLegacyOrder |
	SimpleRaribleV2Order |
	SimpleOpenSeaV1Order
