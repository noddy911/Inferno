/**
 * Cost-plus pricing (design §5.4, decision #4).
 *
 *   marginBase = totalCost × (1 + profitMargin%)
 *   taxable    = marginBase − discount          (discount is % of marginBase or flat ₹)
 *   gst        = taxable × outputGstRate%
 *   total      = taxable + gst
 *
 * All arithmetic is integer paise (shared/money.js); GST is rounded once on the
 * discounted taxable value (round-half-up), never per line. Bounds are enforced here as
 * domain rules (PRICING_BOUNDS): profit margin and GST rate 0–100, discount % 0–100.
 */

import { mulOf, pctOf, toMinor } from '../../shared/money.js';
import { pricingBounds } from '../../shared/errors.js';

/**
 * @param {object} args
 * @param {number} args.totalCostPaise production cost in paise
 * @param {number} args.profitMarginPercent 0–100
 * @param {number} args.outputGstRatePercent 0–100
 * @param {import('./dto.js').Discount} [args.discount]
 * @returns {import('./dto.js').PricingResult}
 */
export function computePricing({ totalCostPaise, profitMarginPercent, outputGstRatePercent, discount }) {
  if (profitMarginPercent < 0 || profitMarginPercent > 100) {
    throw pricingBounds(`profitMargin must be between 0 and 100%, got ${profitMarginPercent}%`, {
      profitMarginPercent,
    });
  }
  if (outputGstRatePercent < 0 || outputGstRatePercent > 100) {
    throw pricingBounds(`outputGstRate must be between 0 and 100%, got ${outputGstRatePercent}%`, {
      outputGstRatePercent,
    });
  }

  const marginBasePaise = mulOf(totalCostPaise, 1 + profitMarginPercent / 100);

  let discountResolved = null;
  if (discount) {
    if (discount.type === 'percent' && discount.value > 100) {
      throw pricingBounds(`percent discount cannot exceed 100%, got ${discount.value}%`, {
        discount,
      });
    }
    const amountPaise =
      discount.type === 'flat'
        ? toMinor(discount.value)
        : pctOf(marginBasePaise, discount.value);
    discountResolved = { type: discount.type, value: discount.value, amountPaise };
  }

  const taxablePaise = Math.max(0, marginBasePaise - (discountResolved?.amountPaise ?? 0));
  const gstPaise = pctOf(taxablePaise, outputGstRatePercent);
  const totalPaise = taxablePaise + gstPaise;
  const profitPaise = marginBasePaise - totalCostPaise;
  const profitPercent = totalCostPaise ? (profitPaise / totalCostPaise) * 100 : 0;

  return {
    profitMarginPercent,
    marginBasePaise,
    discount: discountResolved,
    taxablePaise,
    outputGstRatePercent,
    gstPaise,
    totalPaise,
    profitPaise,
    profitPercent: Number(profitPercent.toFixed(4)),
  };
}
