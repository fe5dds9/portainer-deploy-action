const core = require('@actions/core');
const axios = require('axios');
const https = require('https');
const fs = require('fs');

async function run() {
  try {
    // Get inputs
    const portainerUrl = core.getInput('portainer-url', { required: true });
    const username = core.getInput('portainer-username', { required: true });
    const password = core.getInput('portainer-password', { required: true });
    const endpoint = core.getInput('portainer-endpoint', { required: true });
    const stackName = core.getInput('stack-name', { required: true });
    const stackFile = core.getInput('stack-file') || 'docker-compose.yml';
    const stackVars = core.getInput('stack-vars') || '';
    const prune = core.getBooleanInput('prune');
    const pullImage = core.getBooleanInput('pull-image');
    const teamNames = core.getInput('team-names') || '';
    const disableProxy = core.getBooleanInput('disable-proxy');
    const vaultSecrets = JSON.parse(core.getInput('vault-secrets') || '{}');

    // Create axios instance with optional proxy disable
    const api = axios.create({
      baseURL: `${portainerUrl}/api`,
      httpsAgent: new https.Agent({ 
        rejectUnauthorized: false 
      }),
      proxy: disableProxy ? false : undefined
    });

    // Authenticate
    core.info('🔐 Authenticating with Portainer...');
    const { data: { jwt } } = await api.post('/auth', { username, password });
    api.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
    core.info('✅ Authentication successful');

    // Get Swarm ID and existing stacks
    core.info('📋 Checking stack status...');
    const [{ data: swarm }, { data: stacks }] = await Promise.all([
      api.get(`/endpoints/${endpoint}/docker/swarm`),
      api.get('/stacks')
    ]);

    const swarmId = swarm.ID || swarm.Id;
    if (!swarmId) throw new Error('Failed to get Swarm ID');
    
    const existing = stacks.find(s => s.Name === stackName);
    core.info(existing ? `📝 Found existing stack (ID: ${existing.Id})` : '🆕 Stack will be created');

    // Read compose file
    const compose = fs.readFileSync(stackFile, 'utf8');

    // Parse variables (supports both KEY: VALUE and KEY=VALUE)
    const parsedVars = {};
    if (stackVars) {
      stackVars.split('\n')
        .filter(line => line.includes(':') || line.includes('='))
        .forEach(line => {
          const sep = line.includes(':') ? ':' : '=';
          const [key, ...valueParts] = line.split(sep);
          const value = valueParts.join(sep).trim().replace(/^["'](.*)["']$/, '$1');
          parsedVars[key.trim()] = value;
        });
    }

    // Merge with Vault secrets
    const allVars = { ...parsedVars, ...vaultSecrets };
    const env = Object.entries(allVars).map(([name, value]) => ({ name, value }));

    core.info(`📦 Deploying with ${env.length} environment variables`);

    // Deploy stack
    const payload = {
      StackFileContent: compose,
      Env: env,
      Prune: prune,
      PullImage: pullImage,
      ...(existing ? {} : { Name: stackName, SwarmID: swarmId, fromAppTemplate: false })
    };

    const { data } = await api[existing ? 'put' : 'post'](
      existing 
        ? `/stacks/${existing.Id}?endpointId=${endpoint}`
        : `/stacks?type=1&method=string&endpointId=${endpoint}`,
      payload
    );

    const stackId = existing?.Id || data.Id;
    core.info(`✅ Stack ${existing ? 'updated' : 'created'} successfully (ID: ${stackId})`);

    // Set team permissions
    if (teamNames) {
      const resourceId = existing?.ResourceControl?.Id || data?.ResourceControl?.Id;
      if (resourceId) {
        const { data: teams } = await api.get('/teams');
        const teamIds = teamNames.split(',')
          .map(name => teams.find(t => t.Name === name.trim())?.Id)
          .filter(Boolean);

        if (teamIds.length) {
          await api.put(`/resource_controls/${resourceId}`, {
            Teams: teamIds,
            Public: false,
            AdministratorsOnly: false
          });
          core.info(`👥 Access granted to ${teamIds.length} team(s)`);
        }
      }
    }

    // Set outputs
    core.setOutput('stack-id', stackId);
    core.setOutput('stack-status', existing ? 'updated' : 'created');

  } catch (error) {
    core.setFailed(`Deployment failed: ${error.message}`);
    if (error.response?.data) {
      core.error(`API response: ${JSON.stringify(error.response.data)}`);
    }
  }
}

run();