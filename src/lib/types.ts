// Hand-written types mirroring schema.sql + schema-fix-*.sql.

export type UserRole = "buyer" | "seller" | "both";
export type FulfillmentType = "in_stock" | "pre_order";
export type OrderStatus = "placed" | "packed" | "confirmed" | "disputed";
export type DeliveryMethod = "delivery" | "pickup";
export type DeliveryFlexibility = "flexible" | "exact";

export interface Profile {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
}

export interface Store {
  id: string;
  seller_id: string;
  store_name: string;
  description: string | null;
  delivery_radius_km: number;
  offers_delivery: boolean;
  offers_pickup: boolean;
  courier_note: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Listing {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  fulfillment_type: FulfillmentType;
  quantity: number | null;
  lead_time_days: number | null;
  photo_url: string | null;
  photo_urls: string[];
  search_keywords: string | null;
  is_active: boolean;
  created_at: string;
}

export type ListingWithStore = Listing & {
  stores: Pick<
    Store,
    "id" | "store_name" | "description" | "offers_delivery" | "offers_pickup" | "delivery_radius_km"
  > | null;
};

export interface Order {
  id: string;
  buyer_id: string;
  store_id: string;
  status: OrderStatus;
  subtotal: number;
  delivery_method: DeliveryMethod | null;
  delivery_address: string | null;
  packed_photo_url: string | null;
  recipient_id: string | null;
  recipient_name: string | null;
  recipient_phone: string | null;
  gift_message: string | null;
  requested_delivery_date: string | null;
  delivery_flexibility: DeliveryFlexibility;
  dispute_reason: string | null;
  created_at: string;
  updated_at: string;
}

export type OrderWithItems = Order & {
  order_items: OrderItem[];
  stores: Pick<Store, "store_name" | "seller_id"> | null;
};

export interface OrderItem {
  id: string;
  order_id: string;
  listing_id: string | null;
  listing_name_snapshot: string;
  quantity: number;
  price_at_purchase: number;
}

export interface OrderStatusHistoryEntry {
  id: string;
  order_id: string;
  status: string;
  note: string | null;
  photo_url: string | null;
  created_by: string;
  created_at: string;
}

export interface Recipient {
  id: string;
  user_id: string;
  name: string;
  phone: string;
  address: string | null;
  created_at: string;
}

export type StockRequestStatus = "open" | "responded" | "closed";

export interface StockRequest {
  id: string;
  listing_id: string | null;
  listing_name_snapshot: string | null;
  store_id: string;
  buyer_id: string;
  requested_quantity: number;
  message: string | null;
  status: StockRequestStatus;
  seller_reply: string | null;
  created_at: string;
}

export interface Occasion {
  id: string;
  title: string;
  month: number;
  day: number;
  description: string | null;
  suggested_keywords: string | null;
}

export interface UserSpecialDate {
  id: string;
  user_id: string;
  label: string;
  month: number;
  day: number;
}

/** One recipient's worth of a listing in the gift cart — this becomes one
 *  order at checkout, even if several cart items share a store. */
export interface CartItem {
  cartItemId: string;
  listingId: string;
  listingName: string;
  listingPrice: number;
  photo: string | null;
  storeId: string;
  storeName: string;
  storeOffersDelivery: boolean;
  storeOffersPickup: boolean;
  fulfillmentType: FulfillmentType;
  recipientId: string | null;
  recipientName: string;
  recipientPhone: string;
  recipientAddress: string;
  quantity: number;
  deliveryFlexibility: DeliveryFlexibility;
  requestedDeliveryDate: string | null;
  giftMessage: string | null;
}