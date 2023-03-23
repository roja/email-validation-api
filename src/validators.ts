import {
  Bool,
  DateOnly,
  Int,
  OpenAPIRoute,
  Path,
  Query,
  Str,
  Email,
} from "@cloudflare/itty-router-openapi";

type ValidationResponse = {
  emailAddress: string;
  valid: boolean;
  reason?: string[];
};

const ExampleValidationResponse: ValidationResponse = {
  emailAddress: Email,
  valid: Bool,
  reason: [new Str({ required: false })], // optional
};

const ValidationRequest = {
  emailAddress: new Str({
    example: "user@example.com",
    description: "The email address to be validated",
  }),
};

export class validate extends OpenAPIRoute {
  static schema = {
    tags: ["Endpoints"],
    summary:
      "Get an email validation posting the email address as a json in the request body",
    requestBody: ValidationRequest,
    responses: {
      "200": {
        schema: ExampleValidationResponse,
      },
    },
  };

  async handle(
    request: Request,
    env: any,
    context: any,
    data: Record<string, any>
  ) {
    return await validateEmail(data.body.emailAddress);
  }
}

export class isValid extends OpenAPIRoute {
  static schema = {
    tags: ["Endpoints"],
    summary:
      "Get an email validation passing the email address as a query parameter",
    parameters: {
      emailAddress: Query(Str, {
        description: "The email address to be validated",
        example: "user@example.com",
      }),
    },
    responses: {
      "200": {
        schema: ExampleValidationResponse,
      },
    },
  };

  async handle(
    request: Request,
    env: any,
    context: any,
    data: Record<string, any>
  ) {
    return await validateEmail(data.emailAddress);
  }
}

// A function that takes an email address and checks if it conforms to RFC 5322
// https://datatracker.ietf.org/doc/html/rfc5322
function validateEmailRegex(emailAddress: string): ValidationResponse {
  // https://datatracker.ietf.org/doc/html/rfc5322#section-3.4.1
  const emailRegex = new RegExp(
    "^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$"
  );
  if (emailRegex.test(emailAddress)) {
    return {
      emailAddress: emailAddress,
      valid: true,
    };
  } else {
    return {
      emailAddress: emailAddress,
      valid: false,
      reason: [
        "Email address does not conform to RFC 5322 i.e. is not a valid email address format",
      ],
    };
  }
}

// A function that extracts the domain from an email address
function extractDomain(emailAddress: string): string {
  return emailAddress.split("@")[1];
}

// A function that performs a dns lookup using dns over https and the dns-json endpoint of Cloudflare and returns the answer
async function dnsLookup(domain: string): Promise<any> {
  var url = `https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`;
  var response = await fetch(url, {
    method: "GET",
    headers: { accept: "application/dns-json" },
  });
  var json = await response.json();
  return json;
}

// A function that takes a dns response and checks if the domain is registered
function isDomainRegistered(dnsResponse: any): boolean {
  return dnsResponse.Status === 0;
}

// A function that checks a dns response for a valid MX record and handles the case where there are no MX records
function hasValidMXRecord(dnsResponse: any): boolean {
  // if there is no ansewer section return false
  if (!dnsResponse.Answer) {
    return false;
  }
  return dnsResponse.Answer.some((answer: any) => answer.type === 15);
} // 15 is the type code for MX records

async function validateEmail(
  emailAddress: string
): Promise<ValidationResponse> {
  var hasValidRegex = validateEmailRegex(emailAddress);
  if (!hasValidRegex.valid) {
    return hasValidRegex;
  }

  var domain = extractDomain(emailAddress);

  var domainDns = await dnsLookup(domain);

  if (!isDomainRegistered(domainDns)) {
    return {
      emailAddress: emailAddress,
      valid: false,
      reason: ["Domain is not registered"],
    };
  }

  if (!hasValidMXRecord(domainDns)) {
    return {
      emailAddress: emailAddress,
      valid: false,
      reason: ["Domain does not have a valid MX records"],
    };
  }

  return {
    emailAddress: emailAddress,
    valid: true,
  };
}
