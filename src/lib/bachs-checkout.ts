import {billingPlan,type BillingInterval,type BillingMode} from './billing';
/** Bachs owns country/currency/payment selection; paid checkouts must not narrow its methods. */
export function bachsCheckoutPricing(mode:BillingMode,interval:BillingInterval,productId:string){
 return mode==='prepaid'
  ?{pricing:{currency:'USD',amount:billingPlan[interval],price_type:'fixed' as const}}
  :{product_cart:[{product_id:productId,quantity:1}],billing_currency:'USD',payment_method_types:['USD_CARD' as const]};
}
