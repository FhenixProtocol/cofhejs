export const TaskManagerAddress = "0xeA30c4B8b44078Bbf8a6ef5b9f1eC1626C7848D9";

export const fnAclIface = ["function acl() view returns (address)"];
export const fnEip712DomainIface = [
  `function eip712Domain() public view returns (
    bytes1 fields,
    string name,
    string version,
    uint256 chainId,
    address verifyingContract,
    bytes32 salt,
    uint256[] extensions
  )`,
];
