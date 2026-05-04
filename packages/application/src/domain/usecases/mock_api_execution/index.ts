import { AppContext } from "../../..";

function executeMockApi(ctx: AppContext, id: string, request_data: any) {
  /**
   * First, get the mock api response with this id and then fetch the mock api
   * Second, check redis if all variables for this mock api exist...
   * ...and update TTL for all that exist, else insert again with default values.
   * Third, we map all the inputs of this request - URL, request body, headers, cookies, and rate limit config
   * Fourth, we check if rate limited or not.
   */
}
