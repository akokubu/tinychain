"use strict";

const { State } = require("./blockchain");

module.exports = [
  // alice
  new State(
    "0407105b4308bc79dc2bbfb54564d6768d75e56742070c05a90e95561a5b6a47fe0e1b463ad8c04e871558c5ae93459aa7c1d96af1395b7f13a4041e91011d7504",
    0,
    200
  ),
  // bob
  new State(
    "04ae5e114fc88446df33c0e042048d4f52f611a42b5b2118108b0a9bdaa0f0ac27f684067e3b5cf4591e5b05848746dd3b0c3a8f510773237da354f15c666b9aa6",
    0,
    100
  ),
  // tom
  new State(
    "04c1c0801e404f3f58521e50638210a6453b352c6fd70e1c11cee7e370cf0f26c31f098922459b11a3abbdc6b183629e9bf8ac9fadd1160f221d178f3d105c0028",
    0,
    300
  ),
];
