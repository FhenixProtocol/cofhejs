import { isAddress, ZeroAddress } from "ethers";
import { z } from "zod";

const SerializedSealingPair = z.object({
  privateKey: z.string(),
  publicKey: z.string(),
});

const zPermitWithDefaults = z.object({
  name: z.string().optional().default("Unnamed Permit"),
  type: z.enum(["self", "sharing", "recipient"]),
  issuer: z
    .string()
    .refine((val) => isAddress(val), {
      message: "Permit issuer :: invalid address",
    })
    .refine((val) => val !== ZeroAddress, {
      message: "Permit issuer :: must not be zeroAddress",
    }),
  expiration: z.number().optional().default(1000000000000),
  recipient: z
    .string()
    .optional()
    .default(ZeroAddress)
    .refine((val) => isAddress(val), {
      message: "Permit recipient :: invalid address",
    }),
  validatorId: z.number().optional().default(0),
  validatorContract: z
    .string()
    .optional()
    .default(ZeroAddress)
    .refine((val) => isAddress(val), {
      message: "Permit validatorContract :: invalid address",
    }),
  sealingPair: SerializedSealingPair.optional(),
  issuerSignature: z.string().optional().default("0x"),
  recipientSignature: z.string().optional().default("0x"),
});

type zPermitType = z.infer<typeof zPermitWithDefaults>;

/**
 * Permits allow a hook into an optional external validator contract,
 * this check ensures that IF an external validator is applied, that both `validatorId` and `validatorContract` are populated,
 * ELSE ensures that both `validatorId` and `validatorContract` are empty
 */
const PermitRefineValidator = [
  (data: zPermitType) =>
    (data.validatorId !== 0 && data.validatorContract !== ZeroAddress) ||
    (data.validatorId === 0 && data.validatorContract === ZeroAddress),
  {
    message:
      "Permit external validator :: validatorId and validatorContract must either both be set or both be unset.",
    path: ["validatorId", "validatorContract"] as string[],
  },
] as const;

/**
 * SuperRefinement that checks a Permits signatures
 * checkRecipient - whether to validate that `recipient` is empty for permit with type <self>, and populated for <sharing | recipient>
 * checkSealingPair - only the fully formed permit requires the sealing pair, it can be optional for permit create params
 * checkExistingSignatures - not optional - checks that the permit's type matches the populated signature fields
 * checkSigned - checks that the active user's signature has been signed and added. <self | signed> -> issuerSignature, <recipient> -> recipientSignature
 */
const PermitSignaturesSuperRefinement = (options: {
  checkRecipient: boolean;
  checkSealingPair: boolean;
  checkSigned: boolean;
}) => {
  return (data: zPermitType, ctx: z.RefinementCtx) => {
    // Check Recipient
    //    If type <self | sharing>, `Permit.recipient` must be zeroAddress
    //    If type <recipient>, `Permit.recipient` must not be zeroAddress
    if (options.checkRecipient) {
      if (data.type === "self" && data.recipient !== ZeroAddress)
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["recipient"],
          message: `Permit (type '${data.type}') recipient :: must be empty (zeroAddress)`,
        });
      if (
        (data.type === "recipient" || data.type === "sharing") &&
        data.recipient === ZeroAddress
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["recipient"],
          message: `Permit (type '${data.type}') recipient :: must not be empty`,
        });
      }
    }

    // Check Sealing Pair
    if (options.checkSealingPair && data.sealingPair == null)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sealingPair"],
        message: `Permit sealingPair :: must not be empty`,
      });

    // Check existing signatures match type (not checking this user's signature, but the other signature)
    //     If type <self | sharing>, `Permit.recipientSignature` must be empty
    //     If type <recipient>, `Permit.issuerSignature` must not be empty
    if (
      (data.type === "self" || data.type === "sharing") &&
      data.recipientSignature !== "0x"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["recipientSignature"],
        message: `Permit (type '${data.type}') recipientSignature :: should not be populated by the issuer`,
      });
    }
    if (data.type === "recipient" && data.issuerSignature === "0x") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["issuerSignature"],
        message: `Permit (type 'recipient') issuerSignature :: \`issuer\` must sign the Permit before sharing it with \`recipient\``,
      });
    }

    // Check Signed
    //     If type <self | sharing>, `Permit.issuerSignature` must not be empty
    //     If type <recipient>, `Permit.recipientSignature` must not be empty
    if (options.checkSigned) {
      if (
        (data.type === "self" || data.type === "sharing") &&
        data.issuerSignature === "0x"
      )
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["issuerSignature"],
          message: `Permit (type '${data.type}') issuerSignature :: must be populated with issuer's signature. Use \`Permit.sign\` or create permit with \`Permit.createAndSign\``,
        });
      if (data.type === "recipient" && data.recipientSignature === "0x") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["recipientSignature"],
          message: `Permit (type 'recipient') recipientSignature :: must be populated with recipient's signature. Use \`Permit.sign\` or create permit with \`Permit.createAndSign\``,
        });
      }
    }

    return;
  };
};

/**
 * Validator for the params used when creating a fresh Permit
 * Has defaults added that will be populated in the options object
 * Signatures superRefinement checks only the recipient, sealingPair and signatures are not necessary in the Permit params
 */
export const PermitParamsValidator = zPermitWithDefaults
  .refine(...PermitRefineValidator)
  .superRefine(
    PermitSignaturesSuperRefinement({
      checkRecipient: true,
      checkSealingPair: false, // SealingPair not required when creating a fresh permit
      checkSigned: false, // Signature not required when creating a fresh permit
    }),
  );

/**
 * Validator for a Permit that is expected to be fully formed
 * Does not allow optional values or offer defaults
 * Validates that the correct signatures are populated
 * Validates sealingPair is populated
 */
export const FullyFormedPermitValidator = zPermitWithDefaults
  .required()
  .refine(...PermitRefineValidator)
  .superRefine(
    PermitSignaturesSuperRefinement({
      checkRecipient: true,
      checkSealingPair: true,
      checkSigned: true,
    }),
  );
