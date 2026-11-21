/**
 * The number of distinct seeds `/api/flight` answers to. Shared by the poller
 * and the route so the client never draws a seed the edge has no copy of; see
 * the route for why the count caps invocations.
 */
export const FLIGHT_SEEDS = 64
