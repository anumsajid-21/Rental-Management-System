import { GoogleGenAI } from '@google/genai';

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Preferred model according to current guidelines
const MODEL_NAME = 'gemini-2.5-flash';

const SYSTEM_INSTRUCTION = `You are Rehainsh AI (رہائش اسسٹنٹ), an intelligent rental property assistant for the رہائش Rental Management System in Pakistan.
Key Guidelines:
1. Always format financial figures in Pakistani Rupees (PKR), never USD or generic dollars.
2. Help tenants, landlords (property owners), and administrators with rent inquiries, lease terms, tenancy regulations in Pakistan (e.g., Sindh/Punjab Rented Premises regulations), maintenance guidance, and platform navigation.
3. Keep responses structured, concise, and friendly with clear markdown bullet points when helpful.
4. If a tenant asks about maintenance, advise them on safety first, then direct them to log a formal maintenance ticket in the portal.`;

/**
 * Chat with the Rehainsh Rental AI Assistant.
 */
export async function chatWithRentalAssistant(messages = [], userContext = {}) {
  const userRole = userContext.role || 'user';
  const userName = userContext.name || 'User';

  if (!ai || !apiKey || apiKey === 'your_gemini_api_key_here') {
    return generateFallbackChatResponse(messages, userRole, userName);
  }

  try {
    const formattedContents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content || '' }],
    }));

    // Ensure last message is from user
    if (formattedContents.length === 0) {
      formattedContents.push({ role: 'user', parts: [{ text: 'Hello!' }] });
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: formattedContents,
      config: {
        systemInstruction: `${SYSTEM_INSTRUCTION}\nCurrent active user: ${userName} (Role: ${userRole}).`,
        temperature: 0.7,
      },
    });

    return response.text || 'I am here to help you with all your rental and property inquiries.';
  } catch (err) {
    console.error('[aiService] Gemini API error, falling back to local assistant:', err.message);
    return generateFallbackChatResponse(messages, userRole, userName);
  }
}

/**
 * Intelligent maintenance issue troubleshooting & triage.
 */
export async function troubleshootMaintenance(description = '') {
  if (!ai || !apiKey || apiKey === 'your_gemini_api_key_here') {
    return generateFallbackTroubleshoot(description);
  }

  try {
    const prompt = `Analyze this rental property maintenance complaint and return a valid JSON object only:
Description: "${description}"

Required JSON fields:
{
  "category": "Plumbing" | "Electrical" | "Air Conditioning" | "Structural" | "Painting" | "Appliances" | "General",
  "priority": "low" | "medium" | "high",
  "suggestedTitle": "Concise 4-8 word title",
  "troubleshootingTips": ["1-3 immediate safe DIY checks for the tenant"],
  "immediateAction": "Advice on whether to turn off mains/water/avoid use"
}`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    });

    const parsed = JSON.parse(response.text);
    return {
      success: true,
      data: parsed,
    };
  } catch (err) {
    console.error('[aiService] Maintenance troubleshooting error:', err.message);
    return generateFallbackTroubleshoot(description);
  }
}

/**
 * Enhance property listing descriptions for property owners.
 */
export async function enhancePropertyDescription(details = {}) {
  const { name = '', location = '', bedrooms = 1, bathrooms = 1, rent = 0, amenities = [] } = details;

  if (!ai || !apiKey || apiKey === 'your_gemini_api_key_here') {
    return `Beautiful and modern ${bedrooms}-bedroom, ${bathrooms}-bathroom property located in prime ${location || 'residential area'}. Rent is PKR ${Number(rent).toLocaleString('en-PK')}/month. Equipped with premium amenities including ${amenities.join(', ') || 'essential utilities'}. Ideal for comfortable living with 24/7 security and convenient access to local markets.`;
  }

  try {
    const prompt = `Create an attractive, professional rental property description for a Pakistani real estate portal.
Property: ${name}
Location: ${location}
Bedrooms: ${bedrooms}, Bathrooms: ${bathrooms}
Monthly Rent: PKR ${Number(rent).toLocaleString('en-PK')}
Amenities: ${amenities.join(', ')}

Provide 2-3 engaging paragraphs highlighting the lifestyle, security, and convenience.`;

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (err) {
    console.error('[aiService] Property description enhancement error:', err.message);
    return `Spacious ${bedrooms}-bed, ${bathrooms}-bath rental property at ${location}. Monthly Rent: PKR ${Number(rent).toLocaleString('en-PK')}. Features: ${amenities.join(', ')}.`;
  }
}

/* ---------------- Fallback Generators for Resilient Offline Usage ---------------- */

function generateFallbackChatResponse(messages, role, name) {
  const lastMsg = (messages[messages.length - 1]?.content || '').toLowerCase();

  if (lastMsg.includes('rent') || lastMsg.includes('pkr') || lastMsg.includes('pay') || lastMsg.includes('fee')) {
    return `Hello ${name}! All rental payments and dues in Rehainsh are processed in **PKR (Pakistani Rupees)**. 
- You can review current pending rent under the **Transactions** tab.
- All monthly receipts and invoices reflect PKR amounts with 0% currency conversion overhead.
- Rent due dates are typically the 1st to 5th of each calendar month.`;
  }

  if (lastMsg.includes('maintenance') || lastMsg.includes('repair') || lastMsg.includes('leak') || lastMsg.includes('broken')) {
    return `Hello ${name}! If you are experiencing a maintenance issue:
1. Navigate to **Maintenance → Report Issue**.
2. Select your category (e.g. Plumbing, Electrical, AC) and priority.
3. For emergency leaks, turn off the water stop-cock under the sink or main supply valve.
4. The property owner will receive your request immediately and provide an update on the portal.`;
  }

  if (lastMsg.includes('lease') || lastMsg.includes('agreement') || lastMsg.includes('deposit') || lastMsg.includes('contract')) {
    return `Standard rental agreements under Rehainsh are structured according to Pakistani tenancy laws:
- Typically 11 or 12-month renewable leases.
- Standard security deposit is 2 months rent in PKR.
- A 30-day notice period is standard before lease expiration or termination.`;
  }

  return `Hello ${name}! I am Rehainsh AI Assistant. I can help you with:
- 💰 Reviewing rent schedules & payments in **PKR**
- 🔧 Reporting and troubleshooting maintenance requests
- 📄 Understanding tenancy agreements and property rules
- 🏢 Finding suitable properties in Karachi, Lahore, and Islamabad

How can I assist you today?`;
}

function generateFallbackTroubleshoot(description) {
  const text = (description || '').toLowerCase();
  let category = 'General';
  let priority = 'medium';
  let suggestedTitle = 'General Maintenance Issue';
  let troubleshootingTips = ['Ensure the area is well lit and safely accessible.'];
  let immediateAction = 'Take clear photos for the owner review.';

  if (text.includes('leak') || text.includes('water') || text.includes('pipe') || text.includes('drain') || text.includes('tap') || text.includes('sink')) {
    category = 'Plumbing';
    priority = text.includes('flood') || text.includes('burst') ? 'high' : 'medium';
    suggestedTitle = 'Water Leakage / Plumbing Concern';
    troubleshootingTips = [
      'Locate the local shutoff valve beneath the fixture and turn clockwise.',
      'Place a dry bucket or towel under the drip to prevent floor damage.',
    ];
    immediateAction = 'Shut off water supply if continuous dripping occurs.';
  } else if (text.includes('wire') || text.includes('spark') || text.includes('switch') || text.includes('power') || text.includes('light')) {
    category = 'Electrical';
    priority = text.includes('spark') || text.includes('smoke') ? 'high' : 'medium';
    suggestedTitle = 'Electrical Circuit / Fixture Fault';
    troubleshootingTips = [
      'Do not touch exposed wires or wet switchboards.',
      'Check if the breaker for this room tripped in the main distribution board.',
    ];
    immediateAction = 'Switch off the circuit breaker if sparking occurs.';
  } else if (text.includes('ac') || text.includes('air conditioner') || text.includes('cool') || text.includes('heat')) {
    category = 'Air Conditioning';
    priority = 'medium';
    suggestedTitle = 'AC Cooling / Fan Unit Inspection';
    troubleshootingTips = [
      'Check if the remote batteries are fresh and mode is set to Cool (❄️).',
      'Inspect if the front air filters need gentle cleaning.',
    ];
    immediateAction = 'Power down the AC unit if unusual buzzing sounds persist.';
  }

  return {
    success: true,
    data: {
      category,
      priority,
      suggestedTitle,
      troubleshootingTips,
      immediateAction,
    },
  };
}
