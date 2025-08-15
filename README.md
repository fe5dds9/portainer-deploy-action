# Portainer Deploy Action

A robust GitHub Action for deploying Docker stacks to Portainer with enterprise features.

## Features

✅ **Core Functionality**
- Deploy new stacks or update existing ones
- Dynamic Swarm ID detection
- Support for both `KEY: VALUE` and `KEY=VALUE` variable formats
- Team-based access control

✅ **Enterprise Features**
- Proxy bypass for internal networks
- Vault secrets integration
- Proper error handling and logging

✅ **Improvements over bots-house/portainer-deploy-stack-action**
- Fixed API endpoints
- Fixed team permissions for existing stacks
- Added proxy configuration
- Better error messages

## Usage

### Basic Example

```yaml
- uses: fe5dds9/portainer-deploy-action@v1
  with:
    portainer-url: ${{ vars.PORTAINER_URL }}
    portainer-username: ${{ secrets.PORTAINER_USERNAME }}
    portainer-password: ${{ secrets.PORTAINER_PASSWORD }}
    portainer-endpoint: ${{ vars.PORTAINER_ENDPOINT_ID }}
    stack-name: my-app
    stack-file: docker-compose.yml
    stack-vars: |
      IMAGE_TAG: latest
      ENVIRONMENT: production
```

### With Vault Integration

```yaml
- name: Import Vault secrets
  id: vault
  uses: hashicorp/vault-action@v3
  with:
    url: ${{ vars.VAULT_URL }}
    token: ${{ secrets.VAULT_TOKEN }}
    exportEnv: false
    secrets: |
      secret/data/apps/my-app DB_PASSWORD | DB_PASSWORD

- uses: fe5dds9/portainer-deploy-action@v1
  with:
    portainer-url: ${{ vars.PORTAINER_URL }}
    portainer-username: ${{ secrets.PORTAINER_USERNAME }}
    portainer-password: ${{ secrets.PORTAINER_PASSWORD }}
    portainer-endpoint: ${{ vars.PORTAINER_ENDPOINT_ID }}
    stack-name: my-app
    vault-secrets: ${{ toJSON(steps.vault.outputs) }}
    team-names: 'Developers,DevOps'
```

### With Team Access Control

```yaml
- uses: fe5dds9/portainer-deploy-action@v1
  with:
    portainer-url: ${{ vars.PORTAINER_URL }}
    portainer-username: ${{ secrets.PORTAINER_USERNAME }}
    portainer-password: ${{ secrets.PORTAINER_PASSWORD }}
    portainer-endpoint: ${{ vars.PORTAINER_ENDPOINT_ID }}
    stack-name: my-app
    team-names: 'AR_PORTAINER_DEVELOPER_ACCESS,AR_PORTAINER_DEVOPS_ACCESS'
```

## Inputs

| Input                | Description                     | Required | Default              |
|----------------------|---------------------------------|----------|----------------------|
| `portainer-url`      | Portainer instance URL          | Yes      | -                    |
| `portainer-username` | Authentication username         | Yes      | -                    |
| `portainer-password` | Authentication password         | Yes      | -                    |
| `portainer-endpoint` | Endpoint ID                     | Yes      | -                    |
| `stack-name`         | Stack name                      | Yes      | -                    |
| `stack-file`         | Docker compose file path        | No       | `docker-compose.yml` |
| `stack-vars`         | Variables in YAML or ENV format | No       | -                    |
| `prune`              | Remove orphaned services        | No       | `true`               |
| `pull-image`         | Pull latest images              | No       | `true`               |
| `team-names`         | Comma-separated team names      | No       | -                    |
| `disable-proxy`      | Disable proxy for internal      | No       | `true`               |
| `vault-secrets`      | JSON object with secrets        | No       | `{}`                 |

## Outputs

| Output         | Description                 |
|----------------|-----------------------------|
| `stack-id`     | ID of created/updated stack |
| `stack-status` | `created` or `updated`      |

## Migration from bots-house

Simply replace:
```yaml
- uses: bots-house/portainer-deploy-stack-action@v1.1.0
```

With:
```yaml
- uses: fe5dds9/portainer-deploy-action@v1
```

All existing inputs are compatible!

## License

MIT