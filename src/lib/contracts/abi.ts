// src/lib/contracts/abi.ts
export const retroGamingABI =[
		{
			"inputs": [],
			"stateMutability": "nonpayable",
			"type": "constructor"
		},
		{
			"inputs": [
				{
					"internalType": "address",
					"name": "target",
					"type": "address"
				}
			],
			"name": "AddressEmptyCode",
			"type": "error"
		},
		{
			"inputs": [
				{
					"internalType": "address",
					"name": "verifier",
					"type": "address"
				}
			],
			"name": "addVerifier",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"internalType": "uint64",
					"name": "roundDuration",
					"type": "uint64"
				},
				{
					"internalType": "uint64",
					"name": "minStake",
					"type": "uint64"
				},
				{
					"internalType": "uint8",
					"name": "platformFee",
					"type": "uint8"
				},
				{
					"internalType": "uint8",
					"name": "verifierFee",
					"type": "uint8"
				},
				{
					"internalType": "uint64",
					"name": "maxScorePerGame",
					"type": "uint64"
				},
				{
					"internalType": "uint16",
					"name": "maxScoresPerPlayer",
					"type": "uint16"
				},
				{
					"internalType": "bool",
					"name": "active",
					"type": "bool"
				},
				{
					"internalType": "bool",
					"name": "allowUnverifiedScores",
					"type": "bool"
				},
				{
					"internalType": "uint64",
					"name": "minDistributionDelay",
					"type": "uint64"
				},
				{
					"internalType": "bytes32",
					"name": "saltKey",
					"type": "bytes32"
				},
				{
					"internalType": "uint8",
					"name": "maxWinners",
					"type": "uint8"
				},
				{
					"internalType": "uint8",
					"name": "platformFeePercent",
					"type": "uint8"
				},
				{
					"internalType": "uint8[]",
					"name": "winnerPercentages",
					"type": "uint8[]"
				}
			],
			"name": "configureGame",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"internalType": "uint256",
					"name": "roundId",
					"type": "uint256"
				}
			],
			"name": "distributeRewards",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "address",
					"name": "implementation",
					"type": "address"
				}
			],
			"name": "ERC1967InvalidImplementation",
			"type": "error"
		},
		{
			"inputs": [],
			"name": "ERC1967NonPayable",
			"type": "error"
		},
		{
			"inputs": [],
			"name": "EnforcedPause",
			"type": "error"
		},
		{
			"inputs": [
				{
					"internalType": "uint8",
					"name": "",
					"type": "uint8"
				}
			],
			"name": "Err",
			"type": "error"
		},
		{
			"inputs": [],
			"name": "ExpectedPause",
			"type": "error"
		},
		{
			"inputs": [],
			"name": "FailedCall",
			"type": "error"
		},
		{
			"inputs": [],
			"name": "InvalidInitialization",
			"type": "error"
		},
		{
			"inputs": [],
			"name": "NotInitializing",
			"type": "error"
		},
		{
			"inputs": [
				{
					"internalType": "address",
					"name": "owner",
					"type": "address"
				}
			],
			"name": "OwnableInvalidOwner",
			"type": "error"
		},
		{
			"inputs": [
				{
					"internalType": "address",
					"name": "account",
					"type": "address"
				}
			],
			"name": "OwnableUnauthorizedAccount",
			"type": "error"
		},
		{
			"inputs": [],
			"name": "ReentrancyGuardReentrantCall",
			"type": "error"
		},
		{
			"inputs": [],
			"name": "UUPSUnauthorizedCallContext",
			"type": "error"
		},
		{
			"inputs": [
				{
					"internalType": "bytes32",
					"name": "slot",
					"type": "bytes32"
				}
			],
			"name": "UUPSUnsupportedProxiableUUID",
			"type": "error"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"indexed": false,
					"internalType": "uint64",
					"name": "minDistributionDelay",
					"type": "uint64"
				}
			],
			"name": "DistributionDelayUpdated",
			"type": "event"
		},
		{
			"inputs": [],
			"name": "emergencyWithdraw",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"indexed": false,
					"internalType": "uint64",
					"name": "roundDuration",
					"type": "uint64"
				},
				{
					"indexed": false,
					"internalType": "uint64",
					"name": "minStake",
					"type": "uint64"
				},
				{
					"indexed": false,
					"internalType": "uint8",
					"name": "platformFee",
					"type": "uint8"
				},
				{
					"indexed": false,
					"internalType": "uint8",
					"name": "verifierFee",
					"type": "uint8"
				}
			],
			"name": "GameConfigured",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"indexed": false,
					"internalType": "uint256",
					"name": "roundId",
					"type": "uint256"
				},
				{
					"indexed": false,
					"internalType": "uint64",
					"name": "startTime",
					"type": "uint64"
				},
				{
					"indexed": false,
					"internalType": "uint64",
					"name": "endTime",
					"type": "uint64"
				}
			],
			"name": "GameRoundStarted",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"indexed": false,
					"internalType": "bool",
					"name": "active",
					"type": "bool"
				}
			],
			"name": "GameUpdated",
			"type": "event"
		},
		{
			"inputs": [
				{
					"internalType": "address",
					"name": "initialOwner",
					"type": "address"
				}
			],
			"name": "initialize",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"internalType": "uint64",
					"name": "version",
					"type": "uint64"
				}
			],
			"name": "Initialized",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"indexed": false,
					"internalType": "uint16",
					"name": "maxScoresPerPlayer",
					"type": "uint16"
				}
			],
			"name": "MaxScoresPerPlayerUpdated",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "address",
					"name": "previousOwner",
					"type": "address"
				},
				{
					"indexed": true,
					"internalType": "address",
					"name": "newOwner",
					"type": "address"
				}
			],
			"name": "OwnershipTransferred",
			"type": "event"
		},
		{
			"inputs": [],
			"name": "pause",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"internalType": "address",
					"name": "account",
					"type": "address"
				}
			],
			"name": "Paused",
			"type": "event"
		},
		{
			"inputs": [
				{
					"internalType": "address",
					"name": "verifier",
					"type": "address"
				}
			],
			"name": "removeVerifier",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [],
			"name": "renounceOwnership",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"indexed": false,
					"internalType": "uint8",
					"name": "maxWinners",
					"type": "uint8"
				},
				{
					"indexed": false,
					"internalType": "uint8[]",
					"name": "winnerPercentages",
					"type": "uint8[]"
				}
			],
			"name": "RewardDistributionUpdated",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"indexed": false,
					"internalType": "uint256",
					"name": "roundId",
					"type": "uint256"
				},
				{
					"components": [
						{
							"internalType": "address",
							"name": "winnerAddress",
							"type": "address"
						},
						{
							"internalType": "uint128",
							"name": "score",
							"type": "uint128"
						},
						{
							"internalType": "uint256",
							"name": "reward",
							"type": "uint256"
						}
					],
					"indexed": false,
					"internalType": "struct RetroGamingLibrary.Winner[]",
					"name": "winners",
					"type": "tuple[]"
				},
				{
					"indexed": false,
					"internalType": "uint256",
					"name": "platformFee",
					"type": "uint256"
				}
			],
			"name": "RewardsDistributed",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "string",
					"name": "game",
					"type": "string"
				}
			],
			"name": "SaltKeyUpdated",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"indexed": false,
					"internalType": "uint256",
					"name": "roundId",
					"type": "uint256"
				},
				{
					"indexed": true,
					"internalType": "address",
					"name": "player",
					"type": "address"
				},
				{
					"indexed": false,
					"internalType": "uint128",
					"name": "score",
					"type": "uint128"
				},
				{
					"indexed": false,
					"internalType": "bytes32",
					"name": "scoreHash",
					"type": "bytes32"
				}
			],
			"name": "ScoreSubmitted",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"indexed": false,
					"internalType": "uint256",
					"name": "roundId",
					"type": "uint256"
				},
				{
					"indexed": true,
					"internalType": "address",
					"name": "verifier",
					"type": "address"
				},
				{
					"indexed": false,
					"internalType": "address",
					"name": "player",
					"type": "address"
				},
				{
					"indexed": false,
					"internalType": "bool",
					"name": "verified",
					"type": "bool"
				}
			],
			"name": "ScoreVerified",
			"type": "event"
		},
		{
			"inputs": [
				{
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"internalType": "uint64",
					"name": "minDistributionDelay",
					"type": "uint64"
				}
			],
			"name": "setDistributionDelay",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"internalType": "uint64",
					"name": "roundDuration",
					"type": "uint64"
				},
				{
					"internalType": "uint64",
					"name": "minStake",
					"type": "uint64"
				},
				{
					"internalType": "uint8",
					"name": "platformFee",
					"type": "uint8"
				},
				{
					"internalType": "uint8",
					"name": "verifierFee",
					"type": "uint8"
				},
				{
					"internalType": "uint64",
					"name": "maxScorePerGame",
					"type": "uint64"
				},
				{
					"internalType": "uint16",
					"name": "maxScoresPerPlayer",
					"type": "uint16"
				},
				{
					"internalType": "bool",
					"name": "active",
					"type": "bool"
				}
			],
			"name": "setGameConfig",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"internalType": "uint16",
					"name": "maxScoresPerPlayer",
					"type": "uint16"
				}
			],
			"name": "setMaxScoresPerPlayer",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"internalType": "uint8",
					"name": "maxWinners",
					"type": "uint8"
				},
				{
					"internalType": "uint8",
					"name": "platformFeePercent",
					"type": "uint8"
				},
				{
					"internalType": "uint8[]",
					"name": "winnerPercentages",
					"type": "uint8[]"
				}
			],
			"name": "setRewardDistribution",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"internalType": "bool",
					"name": "allowUnverifiedScores",
					"type": "bool"
				}
			],
			"name": "setUnverifiedScoresSetting",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"internalType": "uint128",
					"name": "score",
					"type": "uint128"
				},
				{
					"internalType": "bytes32",
					"name": "hash",
					"type": "bytes32"
				}
			],
			"name": "submitScore",
			"outputs": [],
			"stateMutability": "payable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "address",
					"name": "newOwner",
					"type": "address"
				}
			],
			"name": "transferOwnership",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": false,
					"internalType": "address",
					"name": "account",
					"type": "address"
				}
			],
			"name": "Unpaused",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"indexed": false,
					"internalType": "bool",
					"name": "allowUnverifiedScores",
					"type": "bool"
				}
			],
			"name": "UnverifiedScoresSettingUpdated",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "address",
					"name": "implementation",
					"type": "address"
				}
			],
			"name": "Upgraded",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"indexed": false,
					"internalType": "uint256",
					"name": "roundId",
					"type": "uint256"
				},
				{
					"indexed": false,
					"internalType": "address[]",
					"name": "verifiers",
					"type": "address[]"
				},
				{
					"indexed": false,
					"internalType": "uint256",
					"name": "totalReward",
					"type": "uint256"
				}
			],
			"name": "VerifierRewardsDistributed",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "address",
					"name": "verifier",
					"type": "address"
				},
				{
					"indexed": false,
					"internalType": "bool",
					"name": "status",
					"type": "bool"
				}
			],
			"name": "VerifierUpdated",
			"type": "event"
		},
		{
			"anonymous": false,
			"inputs": [
				{
					"indexed": true,
					"internalType": "address",
					"name": "user",
					"type": "address"
				},
				{
					"indexed": false,
					"internalType": "uint256",
					"name": "amount",
					"type": "uint256"
				}
			],
			"name": "WithdrawalProcessed",
			"type": "event"
		},
		{
			"stateMutability": "nonpayable",
			"type": "fallback"
		},
		{
			"inputs": [],
			"name": "unpause",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"internalType": "bytes32",
					"name": "newSaltKey",
					"type": "bytes32"
				}
			],
			"name": "updateSaltKey",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "address",
					"name": "newImplementation",
					"type": "address"
				},
				{
					"internalType": "bytes",
					"name": "data",
					"type": "bytes"
				}
			],
			"name": "upgradeToAndCall",
			"outputs": [],
			"stateMutability": "payable",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"internalType": "uint256",
					"name": "roundId",
					"type": "uint256"
				},
				{
					"internalType": "uint256[]",
					"name": "scoreIndexes",
					"type": "uint256[]"
				},
				{
					"internalType": "bool[]",
					"name": "validations",
					"type": "bool[]"
				}
			],
			"name": "verifyScoresBatch",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [],
			"name": "withdraw",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"stateMutability": "payable",
			"type": "receive"
		},
		{
			"inputs": [
				{
					"internalType": "string",
					"name": "game",
					"type": "string"
				}
			],
			"name": "getGameConfig",
			"outputs": [
				{
					"components": [
						{
							"internalType": "uint64",
							"name": "roundDuration",
							"type": "uint64"
						},
						{
							"internalType": "uint64",
							"name": "minStake",
							"type": "uint64"
						},
						{
							"internalType": "uint8",
							"name": "platformFee",
							"type": "uint8"
						},
						{
							"internalType": "uint8",
							"name": "verifierFee",
							"type": "uint8"
						},
						{
							"internalType": "uint64",
							"name": "maxScorePerGame",
							"type": "uint64"
						},
						{
							"internalType": "uint16",
							"name": "maxScoresPerPlayer",
							"type": "uint16"
						},
						{
							"internalType": "bool",
							"name": "active",
							"type": "bool"
						},
						{
							"internalType": "bytes32",
							"name": "saltKey",
							"type": "bytes32"
						},
						{
							"internalType": "uint256",
							"name": "currentRound",
							"type": "uint256"
						},
						{
							"internalType": "uint64",
							"name": "lastRoundStartTime",
							"type": "uint64"
						},
						{
							"internalType": "uint8",
							"name": "maxWinners",
							"type": "uint8"
						},
						{
							"internalType": "uint8",
							"name": "platformFeePercent",
							"type": "uint8"
						},
						{
							"internalType": "uint8[]",
							"name": "winnerPercentages",
							"type": "uint8[]"
						},
						{
							"internalType": "bool",
							"name": "allowUnverifiedScores",
							"type": "bool"
						},
						{
							"internalType": "uint64",
							"name": "minDistributionDelay",
							"type": "uint64"
						}
					],
					"internalType": "struct RetroGamingPlatformV6.GameConfig",
					"name": "",
					"type": "tuple"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "address",
					"name": "account",
					"type": "address"
				}
			],
			"name": "getPendingWithdrawals",
			"outputs": [
				{
					"internalType": "uint256",
					"name": "",
					"type": "uint256"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"internalType": "uint256",
					"name": "roundId",
					"type": "uint256"
				}
			],
			"name": "getRoundData",
			"outputs": [
				{
					"components": [
						{
							"components": [
								{
									"internalType": "uint64",
									"name": "startTime",
									"type": "uint64"
								},
								{
									"internalType": "uint64",
									"name": "endTime",
									"type": "uint64"
								},
								{
									"internalType": "uint256",
									"name": "totalPrizePool",
									"type": "uint256"
								},
								{
									"internalType": "bool",
									"name": "rewardsDistributed",
									"type": "bool"
								}
							],
							"internalType": "struct RetroGamingPlatformV6.RoundBasicInfo",
							"name": "basic",
							"type": "tuple"
						},
						{
							"components": [
								{
									"internalType": "address",
									"name": "player",
									"type": "address"
								},
								{
									"internalType": "uint128",
									"name": "score",
									"type": "uint128"
								},
								{
									"internalType": "uint256",
									"name": "blockNumber",
									"type": "uint256"
								},
								{
									"internalType": "bool",
									"name": "verified",
									"type": "bool"
								},
								{
									"internalType": "uint64",
									"name": "stake",
									"type": "uint64"
								},
								{
									"internalType": "bytes32",
									"name": "scoreHash",
									"type": "bytes32"
								},
								{
									"internalType": "address",
									"name": "verifier",
									"type": "address"
								}
							],
							"internalType": "struct RetroGamingLibrary.Score[]",
							"name": "scores",
							"type": "tuple[]"
						},
						{
							"components": [
								{
									"internalType": "address",
									"name": "winnerAddress",
									"type": "address"
								},
								{
									"internalType": "uint128",
									"name": "score",
									"type": "uint128"
								},
								{
									"internalType": "uint256",
									"name": "reward",
									"type": "uint256"
								}
							],
							"internalType": "struct RetroGamingLibrary.Winner[]",
							"name": "winners",
							"type": "tuple[]"
						},
						{
							"internalType": "address[]",
							"name": "verifiers",
							"type": "address[]"
						},
						{
							"internalType": "uint256",
							"name": "prizePool",
							"type": "uint256"
						},
						{
							"internalType": "bool",
							"name": "isActive",
							"type": "bool"
						}
					],
					"internalType": "struct RetroGamingPlatformV6.RoundView",
					"name": "",
					"type": "tuple"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"internalType": "uint256",
					"name": "roundId",
					"type": "uint256"
				},
				{
					"internalType": "bool",
					"name": "verifiedOnly",
					"type": "bool"
				}
			],
			"name": "getScoresByRound",
			"outputs": [
				{
					"components": [
						{
							"internalType": "address",
							"name": "player",
							"type": "address"
						},
						{
							"internalType": "uint128",
							"name": "score",
							"type": "uint128"
						},
						{
							"internalType": "uint256",
							"name": "blockNumber",
							"type": "uint256"
						},
						{
							"internalType": "bool",
							"name": "verified",
							"type": "bool"
						},
						{
							"internalType": "uint64",
							"name": "stake",
							"type": "uint64"
						},
						{
							"internalType": "bytes32",
							"name": "scoreHash",
							"type": "bytes32"
						},
						{
							"internalType": "address",
							"name": "verifier",
							"type": "address"
						}
					],
					"internalType": "struct RetroGamingLibrary.Score[]",
					"name": "",
					"type": "tuple[]"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "string",
					"name": "game",
					"type": "string"
				},
				{
					"internalType": "uint256",
					"name": "roundId",
					"type": "uint256"
				}
			],
			"name": "getVerificationData",
			"outputs": [
				{
					"components": [
						{
							"internalType": "address[]",
							"name": "verifiers",
							"type": "address[]"
						},
						{
							"internalType": "uint256[]",
							"name": "actions",
							"type": "uint256[]"
						},
						{
							"internalType": "uint256[]",
							"name": "rewards",
							"type": "uint256[]"
						}
					],
					"internalType": "struct RetroGamingPlatformV6.VerifierDataView",
					"name": "",
					"type": "tuple"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{
					"internalType": "address",
					"name": "account",
					"type": "address"
				}
			],
			"name": "isVerifier",
			"outputs": [
				{
					"internalType": "bool",
					"name": "",
					"type": "bool"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [],
			"name": "owner",
			"outputs": [
				{
					"internalType": "address",
					"name": "",
					"type": "address"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [],
			"name": "paused",
			"outputs": [
				{
					"internalType": "bool",
					"name": "",
					"type": "bool"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [],
			"name": "proxiableUUID",
			"outputs": [
				{
					"internalType": "bytes32",
					"name": "",
					"type": "bytes32"
				}
			],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [],
			"name": "UPGRADE_INTERFACE_VERSION",
			"outputs": [
				{
					"internalType": "string",
					"name": "",
					"type": "string"
				}
			],
			"stateMutability": "view",
			"type": "function"
		}
	
]as const
  
  export type RetroGamingABI = typeof retroGamingABI
