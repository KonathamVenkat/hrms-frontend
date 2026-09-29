// Used by production builds (angular.json → ehrms → build → production → fileReplacements).
//
// TODO before deploying: set serviceUrl to the address of the deployed `employee` backend,
// with no trailing slash, e.g. 'https://hrms.example.gov.om'. The backend must also allow this
// site's origin via `hrms.cors.allowed-origins` in its application.properties.
//
// The placeholder below is deliberately not a real address: a production build that was never
// configured fails loudly instead of quietly calling localhost.
export const environment = {
  production: true,
  serviceUrl: 'https://REPLACE-WITH-PRODUCTION-API-URL.invalid',
};
