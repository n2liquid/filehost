const DirEntriesModel = require('./model');
const blockExternalAccess = require('../../hooks/blockExternalAccess');
const dbService = require('feathers-nedb');
const requireAuthToken = require('../../hooks/requireAuthToken');

exports.endpointPrefix = '/api/dirEntries';

exports.register = app => {
  app.use(exports.endpointPrefix, dbService({
    Model: DirEntriesModel,
  }));

  const serviceInstance = exports.instance = (
    app.service(exports.endpointPrefix)
  );

  serviceInstance.hooks({
    before: {
      find: [
        requireAuthToken(),

        ctx => {
          const { query, req } = ctx.params;

          // TODO: Validate accessPolicy.

          query.owner = req.token.user;
        },
      ],

      get: [
        blockExternalAccess(404),
      ],

      create: [
        requireAuthToken(),

        ctx => {
          const { data } = ctx;

          // TODO: Validate parent owner.

          if (!data.parent) {
            throw new Error(`Missing parent.`);
          }

          if (!['dir', 'file'].includes(data.type)) {
            throw new Error(
              `Invalid entry type '${data.type}'.`,
            );
          }

          if (!['auth', 'public'].includes(data.accessPolicy)) {
            throw new Error(
              `Invalid accessPolicy '${data.accessPolicy}'.`,
            );
          }

          if (!data.name) {
            throw new Error(`Missing name.`);
          }

          if (data.type === 'file' && !data.uploadId) {
            throw new Error(`Missing uploadId.`);
          }

          const { req } = ctx.params;

          ctx.data = {
            owner: null,
            parent: null,
            type: null,
            name: null,
            uploadId: null,
            accessPolicy: null,
            ctime: null,
            utime: null,
          };

          if (data.type !== 'file') {
            delete ctx.data.uploadId;
          }

          for (const [k, v] of Object.entries(data)) {
            // TODO: Field validations / sanitization.
            ctx.data[k] = v;
          }

          ctx.data = {
            ...ctx.data,

            owner: req.token.user,
            ctime: Date.now(),
            utime: Date.now(),
          };
        },
      ],

      update: [
        blockExternalAccess(404),
      ],

      patch: [
        requireAuthToken(),
        // TODO: Validate entity schema.
        // TODO: Validate owner.
        // TODO: Validate parent owner.
      ],

      remove: [
        requireAuthToken(),
        // TODO: Validate owner.
        // TODO: Only really delete after a minute
        // (so the operation can be undone until then).
      ],
    },

    after: {
      // TODO: Delete unreferenced uploads.
      // TODO: Delete files on disk.
    },
  });
};
