export interface ImageSearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  thumbnail: string;
  category: string;
  tags: string[];
  source: string;
  author: string;
}

export class ImageSearchService {
  private static curatedDatabase: Record<string, ImageSearchResult[]> = {
    padaria: [
      {
        id: 'bakery-1',
        title: 'Pão de Fermentação Natural Artesanal',
        description: 'Sourdough tradicional com crosta estaladiça e miolo aerado com 24h de fermentação lenta.',
        url: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?auto=format&fit=crop&w=400&q=75',
        category: 'padaria',
        tags: ['pão', 'sourdough', 'fermentação natural', 'artesanal', 'padaria'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Chef Panificador',
      },
      {
        id: 'bakery-2',
        title: 'Croissants Franceses Folhados',
        description: 'Massa folhada com manteiga pura, textura leve, dourados no forno e crocância incomparável.',
        url: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?auto=format&fit=crop&w=400&q=75',
        category: 'padaria',
        tags: ['croissant', 'folhado', 'pastelaria', 'manteiga'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Pâtisserie Artisan',
      },
      {
        id: 'bakery-3',
        title: 'Baguete Rústica Tradicional',
        description: 'Baguete de receita francesa autêntica com côdea crocante e aroma tostado irresistível.',
        url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=75',
        category: 'padaria',
        tags: ['baguete', 'pão francês', 'crocante', 'forno a lenha'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Mestre Padeiro',
      },
      {
        id: 'bakery-4',
        title: 'Bolo Artesanal Red Velvet & Frutos Silvestres',
        description: 'Camadas aveludadas de cacau nobre recheadas com cream cheese suave e morangos frescos.',
        url: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=400&q=75',
        category: 'padaria',
        tags: ['bolo', 'confeitaria', 'red velvet', 'sobremesa', 'aniversario'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Confeitaria Fina',
      },
      {
        id: 'bakery-5',
        title: 'Pastéis de Nata Caramelizados',
        description: 'Massa mil-folhas com creme de ovos cremoso polvilhado com canela e açúcar.',
        url: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?auto=format&fit=crop&w=400&q=75',
        category: 'padaria',
        tags: ['pastel de nata', 'doces tradicionais', 'canela'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Tradição Portuguesa',
      },
      {
        id: 'bakery-6',
        title: 'Café Expresso Blend Especial & Cappuccino',
        description: 'Grãos selecionados 100% arábica com crema aveludada e leite vaporizado com latte art.',
        url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=75',
        category: 'padaria',
        tags: ['café', 'expresso', 'cappuccino', 'bebidas', 'barista'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Specialty Coffee Bar',
      },
    ],
    clinica: [
      {
        id: 'clinic-1',
        title: 'Dr. Cardiologia & Medicina Preventiva',
        description: 'Equipa médica de excelência dedicada ao diagnóstico precoce e cuidados cardiovasculares integrais.',
        url: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&w=400&q=75',
        category: 'clinica',
        tags: ['médico', 'cardiologia', 'saúde', 'consulta', 'especialista'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Corpo Clínico',
      },
      {
        id: 'clinic-2',
        title: 'Dra. Pediatria & Cuidados Infantis',
        description: 'Acompanhamento dedicado e humanizado do desenvolvimento e bem-estar de bebés e crianças.',
        url: 'https://images.unsplash.com/photo-1594824813587-40b90a6e30b3?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1594824813587-40b90a6e30b3?auto=format&fit=crop&w=400&q=75',
        category: 'clinica',
        tags: ['pediatria', 'crianças', 'médica', 'saúde infantil'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Corpo Clínico',
      },
      {
        id: 'clinic-3',
        title: 'Salas de Exames Clínicos Avançados',
        description: 'Ambientes esterilizados e equipados com tecnologia de ponta para ecografias, raio-x e ressonância.',
        url: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=400&q=75',
        category: 'clinica',
        tags: ['hospital', 'exames', 'consultório', 'tecnologia médica'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Centro de Diagnóstico',
      },
      {
        id: 'clinic-4',
        title: 'Centro Cirúrgico de Alta Precisão',
        description: 'Bloco operatório moderno desenhado segundo as mais rigorosas diretrizes internacionais de biossegurança.',
        url: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=400&q=75',
        category: 'clinica',
        tags: ['cirurgia', 'bloco operatório', 'saúde', 'medicina'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Unidade Hospitalar',
      },
    ],
    hotel: [
      {
        id: 'hotel-1',
        title: 'Suíte Presidencial com Vista Panorâmica',
        description: 'Espaço requintado com sala de estar privativa, cama king size, terraço amplo e banheira de hidromassagem.',
        url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=400&q=75',
        category: 'hotel',
        tags: ['suíte', 'luxo', 'quarto', 'hotel', 'vista mar'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Resort & Spa',
      },
      {
        id: 'hotel-2',
        title: 'Quarto Deluxe com Varanda Privativa',
        description: 'Decoração contemporânea com materiais nobres, isolamento acústico e todo o conforto para descansar.',
        url: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=400&q=75',
        category: 'hotel',
        tags: ['quarto deluxe', 'cama king', 'hospedagem'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Boutique Hotel',
      },
      {
        id: 'hotel-3',
        title: 'Piscina Infinita & Sunset Lounge',
        description: 'Piscina aquecida debruçada sobre o horizonte com serviço de bar de cocktails e espreguiçadeiras exclusivas.',
        url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=400&q=75',
        category: 'hotel',
        tags: ['piscina', 'lounge', 'sunset', 'lazer'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Resort & Spa',
      },
      {
        id: 'hotel-4',
        title: 'Spa Terapêutico & Circuito Termal',
        description: 'Massagens aromáticas, sauna finlandesa, banho turco e rituais holísticos de revitalização física.',
        url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=400&q=75',
        category: 'hotel',
        tags: ['spa', 'massagem', 'bem-estar', 'termas'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Wellness Sanctuary',
      },
    ],
    ecommerce: [
      {
        id: 'ecom-1',
        title: 'Auriculares Sem Fios Studio Pro',
        description: 'Cancelamento ativo de ruído ambiente, drivers de 40mm em neodímio e bateria até 45 horas.',
        url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=75',
        category: 'ecommerce',
        tags: ['fone', 'auriculares', 'som', 'tecnologia', 'bluetooth'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Tech Gadgets',
      },
      {
        id: 'ecom-2',
        title: 'Smartwatch Esportivo AMOLED',
        description: 'Monitorização cardíaca contínua, oxigénio no sangue, GPS integrado e resistência à água de 50 metros.',
        url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=75',
        category: 'ecommerce',
        tags: ['relogio', 'smartwatch', 'fitness', 'gadget'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Wearables Gear',
      },
      {
        id: 'ecom-3',
        title: 'Mochila Urbana Executiva Impermeável',
        description: 'Compartimento acolchoado para portátil de 16", fechos antifurto e tecido balístico hidrorrepelente.',
        url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=400&q=75',
        category: 'ecommerce',
        tags: ['mochila', 'acessorios', 'viagem', 'executivo'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Travel & Lifestyle',
      },
    ],
    restaurante: [
      {
        id: 'rest-1',
        title: 'Pizza Margherita Clássica em Forno de Pedra',
        description: 'Molho de tomate San Marzano DOP, mozzarella fior di latte e folhas frescas de manjericão genovês.',
        url: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=75',
        category: 'restaurante',
        tags: ['pizza', 'gastronomia', 'italiano', 'artesanal'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Pizzaria Napolitana',
      },
      {
        id: 'rest-2',
        title: 'Hambúrguer Gourmet Black Angus',
        description: 'Carne maturada 180g, queijo cheddar inglês derretido, cebola caramelizada e maionese trufada.',
        url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=75',
        category: 'restaurante',
        tags: ['hamburguer', 'angus', 'gourmet', 'batatas'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Burger House',
      },
      {
        id: 'rest-3',
        title: 'Massa Artesanal Fettuccine aos Frutos do Mar',
        description: 'Massa fresca estaladiça salteada com camarões tigre, amêijoas frescas e azeite extra virgem.',
        url: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=1200&q=85',
        thumbnail: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?auto=format&fit=crop&w=400&q=75',
        category: 'restaurante',
        tags: ['massa', 'fettuccine', 'camarao', 'gastronomia'],
        source: 'Google Visual Analysis / Unsplash Curated',
        author: 'Ristorante Tradizionale',
      },
    ],
  };

  /**
   * Search contextual images according to prompt or item name
   */
  static searchImages(query: string, categoryHint?: string, limit = 6): ImageSearchResult[] {
    const q = (query || '').toLowerCase().trim();
    const cat = (categoryHint || '').toLowerCase().trim();

    // Find category matches
    let matchedCategory = 'padaria';
    if (/cl[ií]nic|m[eé]dic|sa[uú]de|hospital|doutor/i.test(q + ' ' + cat)) {
      matchedCategory = 'clinica';
    } else if (/hotel|pousada|reserva|quarto|hosped/i.test(q + ' ' + cat)) {
      matchedCategory = 'hotel';
    } else if (/loja|ecom|produto|venda|compras|varejo/i.test(q + ' ' + cat)) {
      matchedCategory = 'ecommerce';
    } else if (/pizz|hamburg|restaurante|comida|culin/i.test(q + ' ' + cat)) {
      matchedCategory = 'restaurante';
    }

    const items = this.curatedDatabase[matchedCategory] || this.curatedDatabase.padaria;

    // Filter items matching query words
    if (q) {
      const filtered = items.filter(
        (it) =>
          it.title.toLowerCase().includes(q) ||
          it.description.toLowerCase().includes(q) ||
          it.tags.some((t) => t.toLowerCase().includes(q))
      );
      if (filtered.length > 0) {
        return filtered.slice(0, limit);
      }
    }

    return items.slice(0, limit);
  }

  /**
   * Return high-res image directly for a named item
   */
  static getImageForItem(itemName: string, category?: string): ImageSearchResult {
    const results = this.searchImages(itemName, category, 1);
    return results[0] || {
      id: 'default-img',
      title: itemName,
      description: `Imagem fotográfica de alta definição de ${itemName}.`,
      url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=1200&q=85',
      thumbnail: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=75',
      category: category || 'geral',
      tags: [itemName],
      source: 'Google Visual Analysis',
      author: 'Studio Profissional',
    };
  }
}
