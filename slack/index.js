const jayson = require("jayson/promise");
const { WebClient } = require("@slack/web-api");
const { Liquid } = require("liquidjs");

const accessToken = process.env.SLACK_ACCESS_TOKEN;

const webClient = new WebClient(accessToken);
const engine = new Liquid();

//
// Configuration
//

const list_objects = async () => {
  return {
    objects: null,
  };
};

const list_modes = async ({ object }) => {
  return {
    modes: null,
  };
};

const list_fields = async ({ object, mode }) => {
  return {
    fields: null,
  };
};

const list_options = async ({ object }) => {
  const { channels } = await webClient.users.conversations({
    types: "public_channel,private_channel",
  });

  return {
    options: {
      schema: {
        type: "object",
        properties: {
          channel: {
            title: "Channel",
            description: "Channel that messages are sent to.",
            type: "string",
            enum: channels.map((channel) => channel.id),
            enumNames: channels.map((channel) => channel.name),
          },
          message: {
            label: "Message",
            description: "Template for messages in Liquid format.",
            type: "string",
          },
        },
      },
      uiSchema: {
        message: {
          "ui:widget": "textarea",
        },
      },
    },
  };
};

//
// Validate
//

const validate = async ({ configuration }) => {
  return {
    errors: [],
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
      change: false,
      remove: false,
    },
    skipInitialRun: true,
  };
};

//
// Sync
//

const add = async ({ idColumn, configuration, rows }) => {
  const channel = configuration.channel;
  const message = configuration.message;

  for (const row of rows) {
    const text = await engine.parseAndRender(message, row);
    await webClient.chat.postMessage({ channel, text });
  }

  return {
    rejectedRows: [],
  };
};

const change = async ({ idColumn, configuration, rows }) => null;

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
