#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
	Tool,
} from "@modelcontextprotocol/sdk/types.js";
import fetch from 'node-fetch';

// Tool definition: Consultar eventos do dia na Sy Auto
const SYAUTO_EVENTOS_TOOL: Tool = {
	name: "syauto_eventos_dia",
	description:
		"Consulta os eventos registrados para o dia atual no sistema Sy Auto. " +
		"Não requer parâmetros adicionais.",
	inputSchema: {
		type: "object",
		properties: {},
		required: [],
	},
};

// Recupera URL e Token da API Sy Auto das variáveis de ambiente
const SYAUTO_API_URL = "https://v1.syauto.com.br/api";
const SYAUTO_API_TOKEN = process.env.SYAUTO_API_TOKEN;

if (!SYAUTO_API_URL || !SYAUTO_API_TOKEN) {
	console.error("Erro: SYAUTO_API_URL e SYAUTO_API_TOKEN devem ser definidos.");
	process.exit(1);
}

// Função para consultar eventos do dia na API Sy Auto
async function consultarEventosDoDia(): Promise<string> {
const url = `${SYAUTO_API_URL}/eventos/dia`;

try {
	const response = await fetch(url, {
	method: "GET",
	headers: {
		Authorization: `Bearer ${SYAUTO_API_TOKEN}`,
		"Content-Type": "application/json",
	},
	});

	if (!response.ok) {
	const errorText = await response.text();
	throw new Error(`Erro ao consultar API Sy Auto: ${response.status} ${errorText}`);
	}

	const data = await response.json();

	if (data.eventos && Array.isArray(data.eventos)) {
	return JSON.stringify(data.eventos, null, 2);
	} else {
	return "Nenhum evento encontrado para hoje.";
	}
} catch (error) {
	throw new Error(`Falha na consulta da API Sy Auto: ${error.message}`);
}
}

// Inicializa servidor MCP
const server = new Server(
{
	name: "syauto/eventos-servidor",
	version: "0.1.0",
},
{
	capabilities: { tools: {} },
}
);

// Handler para listar ferramentas disponíveis
server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: SYAUTO_EVENTOS_TOOL,
}));

// Handler para chamada da ferramenta específica
server.setRequestHandler(CallToolRequestSchema, async (request) => {
try {
	const { name } = request.params;

	if (name === "syauto_eventos_dia") {
	const result = await consultarEventosDoDia();
	return {
		content: [{ type: "text", text: result }],
		isError: false,
	};
	} else {
	return {
		content: [{ type: "text", text: `Ferramenta desconhecida: ${name}` }],
		isError: true,
	};
	}
} catch (error) {
	return {
	content: [
		{
		type: "text",
		text: `Erro ao processar solicitação: ${error.message}`,
		},
	],
	isError: true,
	};
}
});

// Inicia o servidor via stdio
async function runServer() {
try {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Servidor MCP Sy Auto Eventos rodando via stdio.");
} catch (error) {
	console.error("Erro fatal ao iniciar servidor MCP:", error);
	process.exit(1);
}
}

runServer().catch((error) => {
	console.error("Erro fatal ao executar servidor MCP:", error);
	process.exit(1);
});
