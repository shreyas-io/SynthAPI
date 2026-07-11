import type { AppContext } from "../../../../server";
import type { AuthenticatedUser } from "../../../entities/authenticated_user";
import type { VariableEt } from "../../../entities/variables";
import { MockApisUsecase } from "../apis";
import { MockApiResponsesUsecase } from "../responses";
import { ProjectsUsecase } from "../projects";

const createSlug = (base: string, organizationId: string) =>
  `${base}-${organizationId.replaceAll("-", "").slice(0, 12)}`;

export async function seedStripeTemplate(
  ctx: AppContext,
  user: AuthenticatedUser,
  organization_id: string,
) {
  const projectsUsecase = ProjectsUsecase(ctx);
  const mockApisUsecase = MockApisUsecase(ctx);
  const responsesUsecase = MockApiResponsesUsecase(ctx);

  const slug = createSlug("stripe-api", organization_id);
  const project = await projectsUsecase.createProject(user, {
    slug,
    name: "Stripe API Mock",
    description: "A fully stateful mock of the Stripe API, simulating real payment flows using Python scripts and global variables.",
    organization_id,
    globals: [
      { name: "charges", type: "object", value: {} },
      { name: "customers", type: "object", value: {} },
    ] satisfies VariableEt[],
    constants: [
      { name: "expected_bearer", type: "string", value: "Bearer sk_test_12345" },
    ] satisfies VariableEt[],
  });

  // 1. Create Charge (POST /v1/charges)
  const createChargeApi = await mockApisUsecase.createMockApi(user, {
    project_id: project.id,
    method: "POST",
    path: "/v1/charges",
    name: "Create Charge",
    description: "Charges a credit card or other payment source.",
    variables: [],
  });

  // Unauthorized response
  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: createChargeApi.id,
    execution_order: 1,
    name: "Unauthorized",
    is_default: false,
    response: {
      status_code: 401,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: { type: "json", value: { error: { message: "Invalid API Key provided", type: "invalid_request_error" } } },
    },
    rule_tree: {
      label: "Unauthenticated",
      type: "or",
      predicates: [
        {
          label: "Invalid Auth Token",
          type: "simple",
          actual: "{{request.headers.authorization}}",
          operator: "not_equals",
          expected: "{{constants.expected_bearer}}",
        },
      ],
      children: [],
    },
    post_response_actions: [],
  });

  // Success response (Stateful)
  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: createChargeApi.id,
    execution_order: 2,
    name: "Successful Charge",
    is_default: true,
    response: {
      status_code: 200,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json_script",
        code: `
import uuid
import time

body = request.get("body", {}).get("value", {})
if isinstance(body, str):
    # Depending on middleware, it might be raw string for urlencoded
    pass

amount = body.get("amount", 2000)
currency = body.get("currency", "usd")
source = body.get("source", "tok_visa")

charge_id = f"ch_{uuid.uuid4().hex[:20]}"
timestamp = int(time.time())

charge = {
    "id": charge_id,
    "object": "charge",
    "amount": int(amount) if str(amount).isdigit() else 2000,
    "amount_captured": int(amount) if str(amount).isdigit() else 2000,
    "amount_refunded": 0,
    "balance_transaction": f"txn_{uuid.uuid4().hex[:20]}",
    "billing_details": { "address": { "city": None, "country": None, "line1": None, "line2": None, "postal_code": None, "state": None }, "email": None, "name": None, "phone": None },
    "calculated_statement_descriptor": "Stripe Mock",
    "captured": True,
    "created": timestamp,
    "currency": currency,
    "customer": None,
    "description": "Mocked Charge",
    "destination": None,
    "dispute": None,
    "disputed": False,
    "failure_balance_transaction": None,
    "failure_code": None,
    "failure_message": None,
    "fraud_details": {},
    "invoice": None,
    "livemode": False,
    "metadata": {},
    "on_behalf_of": None,
    "order": None,
    "outcome": { "network_status": "approved_by_network", "reason": None, "risk_level": "normal", "risk_score": 5, "seller_message": "Payment complete.", "type": "authorized" },
    "paid": True,
    "payment_intent": None,
    "payment_method": "card_1J2b3C4d5e6f7g8h9i0j",
    "payment_method_details": { "card": { "brand": "visa", "checks": { "address_line1_check": None, "address_postal_code_check": None, "cvc_check": None }, "country": "US", "exp_month": 8, "exp_year": 2023, "fingerprint": "xyz123", "funding": "credit", "installments": None, "last4": "4242", "mandate": None, "network": "visa", "three_d_secure": None, "wallet": None }, "type": "card" },
    "receipt_email": None,
    "receipt_number": None,
    "receipt_url": f"https://pay.stripe.com/receipts/acct_123/{charge_id}/rcpt_123",
    "refunded": False,
    "refunds": { "object": "list", "data": [], "has_more": False, "total_count": 0, "url": f"/v1/charges/{charge_id}/refunds" },
    "review": None,
    "shipping": None,
    "source": { "id": source, "object": "card", "address_city": None, "address_country": None, "address_line1": None, "address_line1_check": None, "address_line2": None, "address_state": None, "address_zip": None, "address_zip_check": None, "brand": "Visa", "country": "US", "customer": None, "cvc_check": None, "dynamic_last4": None, "exp_month": 8, "exp_year": 2023, "fingerprint": "xyz123", "funding": "credit", "last4": "4242", "metadata": {}, "name": None, "tokenization_method": None },
    "status": "succeeded",
}

charges = globals.get("charges", {})
charges[charge_id] = charge
globals["charges"] = charges

return charge
`,
      },
    },
    rule_tree: null,
    post_response_actions: [],
  });

  // 2. List Charges (GET /v1/charges)
  const listChargesApi = await mockApisUsecase.createMockApi(user, {
    project_id: project.id,
    method: "GET",
    path: "/v1/charges",
    name: "List Charges",
    description: "Returns a list of charges you've previously created.",
    variables: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: listChargesApi.id,
    execution_order: 1,
    name: "Success",
    is_default: true,
    response: {
      status_code: 200,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json_script",
        code: `
charges_map = globals.get("charges", {})
all_charges = list(charges_map.values())
# Sort by created timestamp descending
all_charges.sort(key=lambda x: x.get("created", 0), reverse=True)

query_params = request.get("query_params", {})
limit = int(query_params.get("limit", 10))

paginated = all_charges[:limit]

return {
    "object": "list",
    "url": "/v1/charges",
    "has_more": len(all_charges) > limit,
    "data": paginated
}
`,
      },
    },
    rule_tree: null,
    post_response_actions: [],
  });

  // 3. Create Customer (POST /v1/customers)
  const createCustomerApi = await mockApisUsecase.createMockApi(user, {
    project_id: project.id,
    method: "POST",
    path: "/v1/customers",
    name: "Create Customer",
    description: "Creates a new customer object.",
    variables: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: createCustomerApi.id,
    execution_order: 1,
    name: "Successful Customer Creation",
    is_default: true,
    response: {
      status_code: 200,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json_script",
        code: `
import uuid
import time

body = request.get("body", {}).get("value", {})
email = body.get("email", None)
name = body.get("name", None)

customer_id = f"cus_{uuid.uuid4().hex[:20]}"
timestamp = int(time.time())

customer = {
    "id": customer_id,
    "object": "customer",
    "address": None,
    "balance": 0,
    "created": timestamp,
    "currency": None,
    "default_source": None,
    "delinquent": False,
    "description": "Mocked Customer",
    "discount": None,
    "email": email,
    "invoice_prefix": "0000000",
    "invoice_settings": { "custom_fields": None, "default_payment_method": None, "footer": None, "rendering_options": None },
    "livemode": False,
    "metadata": {},
    "name": name,
    "next_invoice_sequence": 1,
    "phone": None,
    "preferred_locales": [],
    "shipping": None,
    "tax_exempt": "none",
    "test_clock": None
}

customers = globals.get("customers", {})
customers[customer_id] = customer
globals["customers"] = customers

return customer
`,
      },
    },
    rule_tree: null,
    post_response_actions: [],
  });

  // 4. List Customers (GET /v1/customers)
  const listCustomersApi = await mockApisUsecase.createMockApi(user, {
    project_id: project.id,
    method: "GET",
    path: "/v1/customers",
    name: "List Customers",
    description: "Returns a list of your customers.",
    variables: [],
  });

  await responsesUsecase.createMockApiResponse(user, {
    mock_api_id: listCustomersApi.id,
    execution_order: 1,
    name: "Success",
    is_default: true,
    response: {
      status_code: 200,
      headers: { "content-type": "application/json" },
      cookies: {},
      body: {
        type: "json_script",
        code: `
customers_map = globals.get("customers", {})
all_customers = list(customers_map.values())
all_customers.sort(key=lambda x: x.get("created", 0), reverse=True)

query_params = request.get("query_params", {})
limit = int(query_params.get("limit", 10))

paginated = all_customers[:limit]

return {
    "object": "list",
    "url": "/v1/customers",
    "has_more": len(all_customers) > limit,
    "data": paginated
}
`,
      },
    },
    rule_tree: null,
    post_response_actions: [],
  });

  return project;
}
