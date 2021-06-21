const jayson = require('jayson/promise');
const request = require("request-promise-native");
const { createHash } = require("crypto");

const apiKey = process.env.MAILCHIMP_API_KEY;
const dataCenter = process.env.MAILCHIMP_DATA_CENTER;
const audienceId = process.env.MAILCHIMP_AUDIENCE_ID;

//
// Configuration
//

const list_objects = async () => {
  return {
    objects: null
  };
};

const list_modes = async ({ object }) => {
  return {
    modes: [
      {
        id: "upsert",
        label: "Upsert",
        description: "Pushes new records and updates records that change in your source."
      }
    ]
  };
};

const list_fields = async ({ object, mode }) => {
  const { merge_fields: fields } = await request({
    method: "GET",
    url: `https://${dataCenter}.api.mailchimp.com/3.0/lists/${audienceId}/merge-fields?count=500`,
    headers: {
      Authorization: `Basic ${apiKey}`,
      Accept: "application/json",
      "Content-type": "application/json",
    },
    json: true,
  });

  return {
    fields: [
      {
        id: "email",
        label: "Email Address",
        type: "STRING",
        identifier: true
      },
      ...fields.map((f) => ({
        id: f.tag,
        label: f.name,
        type: {
          text: "STRING",
          number: "NUMBER",
          date: "DATETIME",
          datetime: "DATETIME",
          choices: "ENUM",
          user: "STRING",
          contact: "STRING",
          textarea: "STRING",
        }[f.type] || "UNKNOWN"
      }))
    ]
  };
};

const list_options = async ({ object }) => {
  return {
    options: null
  };
};

//
// Validate
//

const validate = async ({ configuration }) => {
  return {
    errors: []
  };
};

//
// Behavior
//

const behavior = async ({ configuration }) => {
  return {
    batchSize: 100,
    operations: {
      add: true,
      change: true,
      remove: false
    },
    skipInitialRun: false
  };
};

//
// Sync
//

const add = async ({ idColumn, configuration, rows }) => {
  return await upsert({configuration, rows});
}

const change = async ({ idColumn, configuration, rows }) => {
  return await upsert({configuration, rows});
};

const upsert = async ({ idColumn, configuration, rows }) => {
  const identifierMapping = configuration.identifierMapping;
  const mappings = configuration.mappings;

  for (const row of rows) {
    const email = row[identifierMapping.from];
    const emailHash = createHash("md5").update(email).digest("hex");

    let mergeFields = {};

    for (const mapping of mappings) {
      mergeFields[mapping.to] = row[mapping.from];
    }

    const body = {
      email_address: email,
      merge_fields: mergeFields,
      status: "subscribed",
    };

    await request({
      simple: true,
      method: "PUT",
      url: `https://${dataCenter}.api.mailchimp.com/3.0/lists/${audienceId}/members/${emailHash}`,
      json: body,
      headers: { Authorization: `Basic ${apiKey}` },
    });
  }

  return {
    rejectedRows: []
  };
};

const remove = async ({ idColumn, configuration, rows }) => null;

//
// Server
//

const server = new jayson.server({
  list_objects,
  list_modes,
  list_fields,
  list_options,
  validate,
  behavior,
  add,
  change,
  remove,
});

server.http().listen(8000);
