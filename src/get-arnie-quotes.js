const LRU = require("lru-cache");
const { httpGet } = require("./mock-http-interface");

const THROTTLING_LIMIT = 10;
const CACHE_MAX_SIZE = 100;

const SUCCESS_KEY = "Arnie Quote";
const FAILURE_KEY = "FAILURE";

const cache = new LRU({ max: CACHE_MAX_SIZE });

/**
 * Fetch Arnie quotes from URLs
 * @param {string[]} urls The urls to be requested
 * @return {Promise} A promise which resolves to a results array.
 */
const getArnieQuotes = async (urls) => {
  if (!Array.isArray(urls) || !urls.every((url) => typeof url === "string")) {
    throw new Error("urls must be an array of strings");
  }

  let results = [];
  let inFlightRequests = [];

  for (const url of urls) {
    inFlightRequests.push(getArnieQuote(url));

    // throttle the number of requests
    if (inFlightRequests.length % THROTTLING_LIMIT === 0) {
      results = results.concat(await Promise.all(inFlightRequests));
      inFlightRequests = [];
    }
  }

  // wait for remaining requests
  results = results.concat(await Promise.all(inFlightRequests));

  return results;
};

/**
 * (Private) Fetch an Arnie quote from URL
 * @param {string[]} urls The urls to be requested
 * @return {Promise} A promise which resolves to a results array.
 */
const getArnieQuote = async (url) => {
  if (typeof url !== "string") {
    throw new Error("url must be a string");
  }

  try {
    // check if URL was already fetched before
    const cacheResults = cache.get(url);
    if (cacheResults) {
      return cacheResults;
    }

    const response = await httpGet(url);

    if (!("status" in response) || !("body" in response)) {
      throw new Error("malformed response");
    }

    const { message } = JSON.parse(response.body);

    if (response.status !== 200) {
      throw new Error(message);
    }

    const results = {
      [SUCCESS_KEY]: message,
    };

    // store successful results in cache
    cache.set(url, results);

    return results;
  } catch (error) {
    // in case of parsing, network failure or anything else
    return {
      [FAILURE_KEY]: error.message || "unknown error",
    };
  }
};

module.exports = {
  getArnieQuotes,
};
