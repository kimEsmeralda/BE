import axios from 'axios';

const POKEAPI_BASE = 'https://pokeapi.co/api/v2';

export async function getPokemonList(req, res) {
  try {
    const limit = req.query.limit || 50;
    const offset = req.query.offset || 0;

    const response = await axios.get(`${POKEAPI_BASE}/pokemon`, {
      params: { limit, offset }
    });

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching Pokemon list' });
  }
}

export async function getPokemonDetails(req, res) {
  try {
    const { id } = req.params;

    const response = await axios.get(`${POKEAPI_BASE}/pokemon/${id}`);
    const speciesResponse = await axios.get(response.data.species.url);

    res.json({
      basic: response.data,
      species: speciesResponse.data
    });
  } catch (error) {
    res.status(500).json({ error: 'Error fetching Pokemon details' });
  }
}

export async function getPokemonByType(req, res) {
  try {
    const { type } = req.params;

    const response = await axios.get(`${POKEAPI_BASE}/type/${type}`);

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching Pokemon by type' });
  }
}

export async function getPokemonByRegion(req, res) {
  try {
    const { region } = req.params;

    const response = await axios.get(`${POKEAPI_BASE}/region/${region}`);

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching Pokemon by region' });
  }
}

export async function getEvolutionChain(req, res) {
  try {
    const { chainId } = req.params;

    const response = await axios.get(`${POKEAPI_BASE}/evolution-chain/${chainId}`);

    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Error fetching evolution chain' });
  }
}
