const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface ImageData {
  base64: string;
  mimeType: string;
}

interface ExtractedData {
  tracking_number?: string;
  warehouse_receipt_number?: string;
  shipper_name?: string;
  shipper_address?: string;
  shipper_city?: string;
  shipper_state?: string;
  shipper_country?: string;
  carrier_name?: string;
  pro_number?: string;
  supplier?: string;
  invoice_number?: string;
  po_number?: string;
  packages?: Array<{
    pieces_count?: number;
    package_type?: string;
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
    description?: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({
          error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to your environment variables.'
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const { images }: { images: ImageData[] } = await req.json();

    if (!images || images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No images provided' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const imageContent = images.map(img => ({
      type: 'image_url',
      image_url: {
        url: `data:${img.mimeType};base64,${img.base64}`,
      },
    }));

    const systemPrompt = `You are an expert at extracting structured data from warehouse receipts, bills of lading, packing slips, and shipping documents.

Extract the following information from the provided document images:

1. Tracking Number (carrier tracking number, typically alphanumeric)
2. Warehouse Receipt Number (internal warehouse receipt ID)
3. Shipper Information:
   - Name (company or person shipping the goods)
   - Address (street address)
   - City
   - State (2-letter code if in US)
   - Country
4. Carrier Information:
   - Carrier Name (e.g., UPS, FedEx, USPS, DHL)
   - PRO Number / BOL Number (bill of lading or pro number)
5. Reference Numbers:
   - Supplier name
   - Invoice Number
   - PO Number (purchase order number)
6. Package Details (for each package/line item):
   - Number of pieces
   - Package type (box, pallet, crate, bag, envelope, etc.)
   - Dimensions (length, width, height in inches)
   - Weight (in pounds)
   - Description of contents

Return ONLY a valid JSON object with this exact structure (omit fields if not found):
{
  "tracking_number": "string",
  "warehouse_receipt_number": "string",
  "shipper_name": "string",
  "shipper_address": "string",
  "shipper_city": "string",
  "shipper_state": "string",
  "shipper_country": "string",
  "carrier_name": "string",
  "pro_number": "string",
  "supplier": "string",
  "invoice_number": "string",
  "po_number": "string",
  "packages": [
    {
      "pieces_count": number,
      "package_type": "box|pallet|crate|bag|envelope|other",
      "length": number,
      "width": number,
      "height": number,
      "weight": number,
      "description": "string"
    }
  ]
}

If multiple documents are provided, merge the information intelligently. If you cannot find a field, omit it from the response.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all warehouse receipt information from these document images.',
              },
              ...imageContent,
            ],
          },
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      return new Response(
        JSON.stringify({
          error: 'Failed to process document with AI',
          details: errorData
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const data = await response.json();
    const extractedText = data.choices[0]?.message?.content || '{}';

    let extractedData: ExtractedData;
    try {
      const jsonMatch = extractedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        extractedData = JSON.parse(jsonMatch[0]);
      } else {
        extractedData = JSON.parse(extractedText);
      }
    } catch (parseError) {
      console.error('Failed to parse AI response:', extractedText);
      return new Response(
        JSON.stringify({
          error: 'Failed to parse AI response',
          raw_response: extractedText
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        tokens_used: data.usage?.total_tokens
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in extract-receipt-data:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
