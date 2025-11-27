
const HttpError = require("../models/http-error");

async function getCoordsForAddress(address) {
  if (!address || !address.trim()) {
    throw new HttpError("Address is required for geocoding.", 422);
  }

  
  return {
    lat: 14.5995,
    lng: 120.9842,
  };
}

module.exports = getCoordsForAddress;
