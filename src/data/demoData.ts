import type { Customer, Product, Sale, ShopDataState, Supplier } from "../types/shop";
import { roundMoney, shiftDaysDateString, shiftMonthsDateString } from "../utils/format";

export const LOW_STOCK_THRESHOLD = 5;

export function createDemoData(): ShopDataState {
  const nowIso = new Date().toISOString();

  const suppliers: Supplier[] = [
    {
      id: "sup_apex",
      name: "Apex Audio & Acoustics",
      contactPerson: "Hannah Lindqvist",
      phone: "+1 (415) 890-3342",
      email: "orders@apexaudio.co",
      address: "420 Howard St, San Francisco, CA",
      productsSupplied: [
        "Sony WH-1000XM5 Headphones",
        "Anker Soundcore Motion+ Speaker",
        "Blue Yeti USB Studio Mic",
      ],
      createdAt: nowIso,
    },
    {
      id: "sup_keycraft",
      name: "KeyCraft Peripherals Ltd.",
      contactPerson: "Marcus Vance",
      phone: "+1 (206) 542-1180",
      email: "wholesale@keycraft.io",
      address: "1105 Pike St, Seattle, WA",
      productsSupplied: [
        "Keychron K8 Pro Mechanical Keyboard",
        "Logitech MX Master 3S Mouse",
        "DeskMat Merino Wool Pad",
      ],
      createdAt: nowIso,
    },
    {
      id: "sup_volt",
      name: "VoltLine Power & Cables",
      contactPerson: "Priya Nair",
      phone: "+1 (512) 409-7721",
      email: "supply@voltline.com",
      address: "814 Congress Ave, Austin, TX",
      productsSupplied: [
        "Anker 737 GaN 120W Charger",
        "Belkin Thunderbolt 4 Hub",
        "Braided USB-C 240W Cable (2m)",
      ],
      createdAt: nowIso,
    },
    {
      id: "sup_lumina",
      name: "Lumina Ergonomics Co.",
      contactPerson: "David Park",
      phone: "+1 (312) 774-9015",
      email: "b2b@luminaergo.com",
      address: "230 W Monroe St, Chicago, IL",
      productsSupplied: [
        "BenQ ScreenBar Halo Monitor Light",
        "Roost V3 Aluminum Laptop Stand",
        "Elgato Facecam Pro 4K",
      ],
      createdAt: nowIso,
    },
  ];

  const products: Product[] = [
    {
      id: "prod_mx3s",
      name: "Logitech MX Master 3S Mouse",
      sku: "PER-MX3S",
      category: "Peripherals",
      quantity: 18,
      purchasePrice: 64.0,
      sellingPrice: 99.0,
      supplierId: "sup_keycraft",
      updatedAt: nowIso,
    },
    {
      id: "prod_k8pro",
      name: "Keychron K8 Pro Mechanical Keyboard",
      sku: "PER-K8PR",
      category: "Peripherals",
      quantity: 4, // Low stock
      purchasePrice: 68.0,
      sellingPrice: 109.0,
      supplierId: "sup_keycraft",
      updatedAt: nowIso,
    },
    {
      id: "prod_xm5",
      name: "Sony WH-1000XM5 Headphones",
      sku: "AUD-XM5B",
      category: "Audio",
      quantity: 3, // Low stock
      purchasePrice: 245.0,
      sellingPrice: 348.0,
      supplierId: "sup_apex",
      updatedAt: nowIso,
    },
    {
      id: "prod_gan120",
      name: "Anker 737 GaN 120W Charger",
      sku: "PWR-G120",
      category: "Accessories",
      quantity: 24,
      purchasePrice: 44.0,
      sellingPrice: 79.0,
      supplierId: "sup_volt",
      updatedAt: nowIso,
    },
    {
      id: "prod_tb4hub",
      name: "Belkin Thunderbolt 4 Hub",
      sku: "CON-TB4H",
      category: "Accessories",
      quantity: 0, // Out of stock (<= 5)
      purchasePrice: 118.0,
      sellingPrice: 179.0,
      supplierId: "sup_volt",
      updatedAt: nowIso,
    },
    {
      id: "prod_screenbar",
      name: "BenQ ScreenBar Halo Monitor Light",
      sku: "ERG-SBAR",
      category: "Workspace",
      quantity: 5, // Low stock boundary (= 5)
      purchasePrice: 105.0,
      sellingPrice: 169.0,
      supplierId: "sup_lumina",
      updatedAt: nowIso,
    },
    {
      id: "prod_roost",
      name: "Roost V3 Aluminum Laptop Stand",
      sku: "ERG-RST3",
      category: "Workspace",
      quantity: 14,
      purchasePrice: 52.0,
      sellingPrice: 89.0,
      supplierId: "sup_lumina",
      updatedAt: nowIso,
    },
    {
      id: "prod_yeti",
      name: "Blue Yeti USB Studio Mic",
      sku: "AUD-YETI",
      category: "Audio",
      quantity: 9,
      purchasePrice: 76.0,
      sellingPrice: 129.0,
      supplierId: "sup_apex",
      updatedAt: nowIso,
    },
    {
      id: "prod_usbc240",
      name: "Braided USB-C 240W Cable (2m)",
      sku: "PWR-C240",
      category: "Accessories",
      quantity: 42,
      purchasePrice: 8.5,
      sellingPrice: 22.0,
      supplierId: "sup_volt",
      updatedAt: nowIso,
    },
    {
      id: "prod_deskmat",
      name: "DeskMat Merino Wool Pad",
      sku: "ERG-DMAT",
      category: "Workspace",
      quantity: 11,
      purchasePrice: 24.0,
      sellingPrice: 48.0,
      supplierId: "sup_keycraft",
      updatedAt: nowIso,
    },
    {
      id: "prod_facecam",
      name: "Elgato Facecam Pro 4K",
      sku: "VID-FC4K",
      category: "Video & Streaming",
      quantity: 2, // Low stock
      purchasePrice: 185.0,
      sellingPrice: 279.0,
      supplierId: "sup_lumina",
      updatedAt: nowIso,
    },
    {
      id: "prod_motion",
      name: "Anker Soundcore Motion+ Speaker",
      sku: "AUD-MOTP",
      category: "Audio",
      quantity: 12,
      purchasePrice: 58.0,
      sellingPrice: 99.0,
      supplierId: "sup_apex",
      updatedAt: nowIso,
    },
  ];

  const customers: Customer[] = [
    {
      id: "cust_elena",
      name: "Elena Rostova",
      phone: "+1 (415) 602-1948",
      email: "elena.rostova@studio9.co",
      notes: "Architecture firm buyer — prefers invoice receipts.",
      createdAt: nowIso,
    },
    {
      id: "cust_devon",
      name: "Devon Brooks",
      phone: "+1 (415) 881-4420",
      email: "devon.brooks@gmail.com",
      notes: "Audio enthusiast, frequent weekend shopper.",
      createdAt: nowIso,
    },
    {
      id: "cust_amara",
      name: "Amara Okafor",
      phone: "+1 (650) 319-7745",
      email: "amara@okaforlabs.com",
      notes: "Bulk office equipment orders every quarter.",
      createdAt: nowIso,
    },
    {
      id: "cust_liam",
      name: "Liam Chen",
      phone: "+1 (510) 742-9031",
      email: "liam.chen@outlook.com",
      notes: "Remote developer setup purchases.",
      createdAt: nowIso,
    },
    {
      id: "cust_sophia",
      name: "Sophia Martinez",
      phone: "+1 (408) 913-6612",
      email: "sophia.m@creativehub.io",
      notes: "Podcast & video production gear client.",
      createdAt: nowIso,
    },
  ];

  const productMap = new Map(products.map((p) => [p.id, p]));
  const customerMap = new Map(customers.map((c) => [c.id, c]));

  const buildSale = (
    id: string,
    productId: string,
    customerId: string | undefined,
    quantity: number,
    date: string
  ): Sale => {
    const product = productMap.get(productId)!;
    const customer = customerId ? customerMap.get(customerId) : undefined;
    const totalAmount = roundMoney(product.sellingPrice * quantity);
    const totalCost = roundMoney(product.purchasePrice * quantity);
    const profit = roundMoney(totalAmount - totalCost);
    return {
      id,
      productId: product.id,
      productName: product.name,
      productSku: product.sku,
      customerId: customer?.id,
      customerName: customer ? customer.name : "Walk-in Customer",
      quantity,
      unitPrice: product.sellingPrice,
      unitCost: product.purchasePrice,
      totalAmount,
      totalCost,
      profit,
      date,
      createdAt: `${date}T14:30:00.000Z`,
    };
  };

  const sales: Sale[] = [
    // Today's sales (ensures Daily Report for today has live figures)
    buildSale("sale_01", "prod_mx3s", "cust_liam", 2, shiftDaysDateString(0)),
    buildSale("sale_02", "prod_usbc240", "cust_devon", 3, shiftDaysDateString(0)),
    buildSale("sale_03", "prod_gan120", undefined, 1, shiftDaysDateString(0)),
    // Recent days in current month
    buildSale("sale_04", "prod_xm5", "cust_devon", 1, shiftDaysDateString(1)),
    buildSale("sale_05", "prod_k8pro", "cust_liam", 2, shiftDaysDateString(1)),
    buildSale("sale_06", "prod_screenbar", "cust_elena", 2, shiftDaysDateString(2)),
    buildSale("sale_07", "prod_roost", "cust_amara", 3, shiftDaysDateString(3)),
    buildSale("sale_08", "prod_facecam", "cust_sophia", 1, shiftDaysDateString(4)),
    buildSale("sale_09", "prod_yeti", "cust_sophia", 2, shiftDaysDateString(5)),
    buildSale("sale_10", "prod_tb4hub", "cust_amara", 2, shiftDaysDateString(6)),
    buildSale("sale_11", "prod_deskmat", "cust_elena", 4, shiftDaysDateString(7)),
    buildSale("sale_12", "prod_motion", undefined, 2, shiftDaysDateString(9)),
    // Previous month & two months ago (ensures multi-month reports & P&L trend)
    buildSale("sale_13", "prod_xm5", "cust_amara", 2, shiftMonthsDateString(1, 24)),
    buildSale("sale_14", "prod_mx3s", "cust_elena", 4, shiftMonthsDateString(1, 18)),
    buildSale("sale_15", "prod_k8pro", "cust_liam", 3, shiftMonthsDateString(1, 12)),
    buildSale("sale_16", "prod_gan120", "cust_devon", 5, shiftMonthsDateString(1, 6)),
    buildSale("sale_17", "prod_yeti", "cust_sophia", 2, shiftMonthsDateString(2, 20)),
    buildSale("sale_18", "prod_tb4hub", "cust_amara", 3, shiftMonthsDateString(2, 11)),
  ];

  return {
    products,
    sales,
    customers,
    suppliers,
  };
}
