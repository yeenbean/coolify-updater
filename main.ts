const COOLIFY_URL = Deno.env.get("COOLIFY_URL")
const TOKEN = Deno.env.get("BEARER_TOKEN")
const API_PATH = "/api/v1"

// emoji console logging ts
function emojiError(message: string) {
  console.error(`🚨 ${message}`)
}

function emojiWarn(message: string) {
  console.error(`⚠️ ${message}`)
}

function emojiOk(message: string) {
  console.error(`✅ ${message}`)
}

// api calls

async function textCall(endpoint: string) {
  try {
    const RESPONSE = await fetch(COOLIFY_URL + API_PATH + endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TOKEN!}`,
        "Content-Type": "application/json"
      }
    })
    if (!RESPONSE.ok) {
      throw new Error(`${RESPONSE.status}\n${RESPONSE.statusText}`)
    }
    return await RESPONSE.text()
  } catch (error) {
    console.error(error)
    throw new Error(`${error}`)
  }
}

async function jsonCall(endpoint: string) {
  try {
    const RESPONSE = await fetch(COOLIFY_URL + API_PATH + endpoint, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${TOKEN!}`,
        "Content-Type": "application/json"
      }
    })
    if (!RESPONSE.ok) {
      throw new Error(`${RESPONSE.status}\n${RESPONSE.statusText}`)
    }
    return await RESPONSE.json()
  } catch (error) {
    console.error(error)
    throw new Error(`${error}`)
  }
}

async function updateEndpoint(endpoint: string, uuid: string) {
  try {
    const RESPONSE = await fetch(`${COOLIFY_URL + API_PATH + endpoint}/${uuid}/restart?latest=true`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN!}`,
        "Content-Type": "application/json",
      }
    })
    if (!RESPONSE.ok) {
      throw new Error(`${RESPONSE.status}\n${RESPONSE.statusText}`)
    }
    return await RESPONSE.json()
  } catch (error) {
    console.error(error)
    throw new Error(`${error}`)
  }
}

// resource updater
async function updateResource(resource: object) {
  if (resource.status.split(":")[0] == "running") {
    console.log(`Updating ${resource.name} on ${resource.server.name}...`)

    // check if server is reachable
    try {
      let server = await jsonCall(`/servers/${resource.server.uuid}`)
      if (server.unreachable_count > 0) {
        emojiWarn(`${server.name} is unreachable. Skipping update.`)
        return
      }
    } catch (error) {
      emojiError(`Getting status of ${resource.server.name} failed. Skipping ${resource.name}...`)
      return
    }

    // update service
    try {
      await updateEndpoint(`/services`, resource.uuid)

      // wait for images to finish pulling
      while(true) {
        await new Promise(resolve => setTimeout(resolve, 500))
        let serviceStatus = await jsonCall(`/services/${resource.uuid}`)
        let status = serviceStatus.status.split(":")[0]
        if (status == "starting") {
          break;
        }
      }
      console.log(`Updated ${resource.name}. Service is now restarting...`)

      // wait for restart to complete
      while(true) {
        await new Promise(resolve => setTimeout(resolve, 500))
        let serviceStatus = await jsonCall(`/services/${resource.uuid}`)
        let status = serviceStatus.status.split(":")[0]
        if (status == "running") {
          break;
        }
      }
      emojiOk(`${resource.name} updated.`)
    } catch (error) {
      emojiError(`Updating ${resource.name} failed.`)
      return
    }
  } else {
    console.log(`${resource.name} is not running. Skipping...`)
  }
}

// main function
async function main() {
  // test connectivity
  try {
    const version = await textCall('/version')
    emojiOk(`Connected to Coolify running ${version}`)
  } catch (error) {
    emojiError(`Coolify is unreachable. Check your configuration and try again.`);
    Deno.exit(-1)
  }

  // get all resources
  let resources: object[]
  try {
    resources = await jsonCall('/services')
    emojiOk(`Retrieved ${resources.length} resources from Coolify.`)
  } catch (error) {
    emojiError(`Unable to fetch resources.`)
    Deno.exit(-2)
  }

  // update all resources

  //console.log(resources[1])
  //Deno.exit()
  for (let i = 0; i < resources.length; i++) {
    const resource = resources[i];
    await updateResource(resource)
  }
}

main()