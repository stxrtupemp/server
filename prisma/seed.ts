import { PrismaClient, Role, PropertyType, OperationType, PropertyStatus, ClientType, ClientSource, DealStatus, TaskPriority } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function hash(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('🌱  Starting seed...');

  // ── 0. Cleanup (orden: restricciones FK) ──────────────────────────────────
  await prisma.note.deleteMany();
  await prisma.task.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.webContact.deleteMany();
  await prisma.propertyImage.deleteMany();
  await prisma.property.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();

  // ── 1. Users ──────────────────────────────────────────────────────────────
  const adminPassword = await hash('Admin1234!');
  const agentPassword = await hash('Agent1234!');

  const admin = await prisma.user.create({
    data: {
      email:         'admin@crminmobiliario.es',
      password_hash: adminPassword,
      name:          'Carlos Administrador',
      role:          Role.ADMIN,
      phone:         '+34 600 000 001',
      active:        true,
    },
  });

  const agent = await prisma.user.create({
    data: {
      email:         'agente@crminmobiliario.es',
      password_hash: agentPassword,
      name:          'Laura García',
      role:          Role.AGENT,
      phone:         '+34 600 000 002',
      active:        true,
    },
  });

  console.log(`  ✓ Users: ${admin.email}, ${agent.email}`);

  // ── 2. Properties ─────────────────────────────────────────────────────────
  const propertiesData = [
    {
      title:       'Ático con terraza en Salamanca',
      description: 'Espectacular ático de 4 habitaciones con terraza de 60 m² en el corazón del barrio de Salamanca. Reformado a estrenar, con materiales de primera calidad.',
      type:        PropertyType.APARTMENT,
      operation:   OperationType.SALE,
      status:      PropertyStatus.AVAILABLE,
      price:       1_250_000,
      area_m2:     145,
      bedrooms:    4,
      bathrooms:   3,
      parking:     1,
      address:     'Calle Serrano 42, 3ºA',
      city:        'Madrid',
      zone:        'Salamanca',
      lat:         40.4275,
      lng:         -3.6857,
      features:    { terrace: true, elevator: true, concierge: true, air_conditioning: true },
      agent_id:    agent.id,
    },
    {
      title:       'Villa con piscina en La Moraleja',
      description: 'Impresionante villa de lujo en parcela de 1.200 m². 6 habitaciones, piscina climatizada, bodega y domótica completa.',
      type:        PropertyType.HOUSE,
      operation:   OperationType.SALE,
      status:      PropertyStatus.RESERVED,
      price:       2_850_000,
      area_m2:     480,
      bedrooms:    6,
      bathrooms:   5,
      parking:     3,
      address:     'Calle del Pinar 15',
      city:        'Alcobendas',
      zone:        'La Moraleja',
      lat:         40.5336,
      lng:         -3.6252,
      features:    { pool: true, garden: true, garage: true, domotics: true, wine_cellar: true },
      agent_id:    admin.id,
    },
    {
      title:       'Apartamento de diseño en Eixample',
      description: 'Moderno apartamento de 2 habitaciones reformado con gusto exquisito. A 2 minutos del Passeig de Gràcia.',
      type:        PropertyType.APARTMENT,
      operation:   OperationType.RENT,
      status:      PropertyStatus.AVAILABLE,
      price:       2_400,
      area_m2:     75,
      bedrooms:    2,
      bathrooms:   1,
      parking:     0,
      address:     'Carrer de Mallorca 234, 2ºB',
      city:        'Barcelona',
      zone:        'Eixample',
      lat:         41.3955,
      lng:         2.1578,
      features:    { elevator: true, air_conditioning: true, furnished: true },
      agent_id:    agent.id,
    },
    {
      title:       'Local comercial prime en Gran Vía',
      description: 'Local de 280 m² en planta baja con gran escaparate a Gran Vía. Actualmente diáfano, listo para cualquier uso comercial.',
      type:        PropertyType.COMMERCIAL,
      operation:   OperationType.RENT,
      status:      PropertyStatus.AVAILABLE,
      price:       9_500,
      area_m2:     280,
      bedrooms:    0,
      bathrooms:   2,
      parking:     0,
      address:     'Gran Vía 45',
      city:        'Madrid',
      zone:        'Centro',
      lat:         40.4197,
      lng:         -3.7040,
      features:    { shop_window: true, corner: false, loading_dock: false },
      agent_id:    agent.id,
    },
    {
      title:       'Solar en zona de expansión Valencia',
      description: 'Parcela urbanizable de 2.500 m² en zona de nuevo desarrollo residencial. Todos los servicios disponibles. Ideal para promoción de 30–40 viviendas.',
      type:        PropertyType.LAND,
      operation:   OperationType.SALE,
      status:      PropertyStatus.AVAILABLE,
      price:       380_000,
      area_m2:     2500,
      bedrooms:    null,
      bathrooms:   null,
      parking:     null,
      address:     'Partida Camí Vell de Picassent s/n',
      city:        'Valencia',
      zone:        'Campanar',
      lat:         39.4858,
      lng:         -0.4133,
      features:    { buildable: true, services_available: true, flat_terrain: true },
      agent_id:    admin.id,
    },
  ] as const;

  const properties = await Promise.all(
    propertiesData.map((p) =>
      prisma.property.create({
        data: {
          ...p,
          slug:       slug(p.title),
          currency:   'EUR',
          price:      p.price,
          area_m2:    p.area_m2 ?? undefined,
          bedrooms:   p.bedrooms ?? undefined,
          bathrooms:  p.bathrooms ?? undefined,
          parking:    p.parking ?? undefined,
          lat:        p.lat,
          lng:        p.lng,
          features:   p.features,
          agent_id:   p.agent_id,
        },
      }),
    ),
  );

  // Añadir imágenes placeholder a las primeras 3 propiedades
  for (const [i, prop] of properties.slice(0, 3).entries()) {
    await prisma.propertyImage.createMany({
      data: [
        { property_id: prop.id, url: `https://picsum.photos/seed/prop${i}a/1200/800`, order: 0, is_cover: true  },
        { property_id: prop.id, url: `https://picsum.photos/seed/prop${i}b/1200/800`, order: 1, is_cover: false },
        { property_id: prop.id, url: `https://picsum.photos/seed/prop${i}c/1200/800`, order: 2, is_cover: false },
      ],
    });
  }

  console.log(`  ✓ Properties: ${properties.map((p) => p.title).join(', ')}`);

  // ── 3. Clients ────────────────────────────────────────────────────────────
  const client1 = await prisma.client.create({
    data: {
      name:     'Andrés Moreno',
      email:    'andres.moreno@email.com',
      phone:    '+34 611 222 333',
      type:     ClientType.BUYER,
      source:   ClientSource.WEB,
      notes:    'Interesado en pisos de lujo en Madrid centro. Presupuesto hasta 1,5M€. Quiere 3–4 habitaciones.',
      agent_id: agent.id,
    },
  });

  const client2 = await prisma.client.create({
    data: {
      name:     'Sofía Castillo',
      email:    'sofia.castillo@empresa.com',
      phone:    '+34 622 333 444',
      type:     ClientType.TENANT,
      source:   ClientSource.REFERRAL,
      notes:    'Busca apartamento en Barcelona, cerca del centro. Presupuesto 2.000–2.500€/mes.',
      agent_id: agent.id,
    },
  });

  const client3 = await prisma.client.create({
    data: {
      name:     'Inversiones Romero SL',
      email:    'contacto@inversionesromero.es',
      phone:    '+34 91 444 5566',
      type:     ClientType.BUYER,
      source:   ClientSource.PORTAL,
      notes:    'Empresa inversora. Busca locales comerciales y solares para desarrollo. Operaciones +500K€.',
      agent_id: admin.id,
    },
  });

  console.log(`  ✓ Clients: ${client1.name}, ${client2.name}, ${client3.name}`);

  // ── 4. Deals ──────────────────────────────────────────────────────────────

  const [propSalamanca, , propBarcelona, , propSolar] = properties as [
    typeof properties[0],
    typeof properties[0],
    typeof properties[0],
    typeof properties[0],
    typeof properties[0],
  ];

  const deal1 = await prisma.deal.create({
    data: {
      property_id:    propSalamanca.id,
      client_id:      client1.id,
      agent_id:       agent.id,
      status:         DealStatus.VISIT,
      amount:         1_220_000,
      commission_pct: 3.0,
      notes:          'El cliente visitó el inmueble el 15/03. Muy interesado. Pendiente de respuesta tras consultar con su banco.',
      expected_close: new Date('2025-05-30'),
    },
  });

  const deal2 = await prisma.deal.create({
    data: {
      property_id:    propBarcelona.id,
      client_id:      client2.id,
      agent_id:       agent.id,
      status:         DealStatus.NEGOTIATION,
      amount:         2_300,
      commission_pct: 5.0,
      notes:          'Sofía propone 2.300€/mes (pide reducción de 100€). Pendiente de aprobación del propietario.',
      expected_close: new Date('2025-04-15'),
    },
  });

  const deal3 = await prisma.deal.create({
    data: {
      property_id:    propSolar.id,
      client_id:      client3.id,
      agent_id:       admin.id,
      status:         DealStatus.LEAD,
      amount:         360_000,
      commission_pct: 2.5,
      notes:          'Primer contacto por portal. Pendiente de enviar dosier completo del solar.',
      expected_close: new Date('2025-06-30'),
    },
  });

  console.log(`  ✓ Deals: ${deal1.id}, ${deal2.id}, ${deal3.id}`);

  // ── 5. Tasks ──────────────────────────────────────────────────────────────
  await prisma.task.createMany({
    data: [
      {
        title:       'Llamar a Andrés para confirmar segunda visita',
        description: 'Confirmar disponibilidad para el próximo jueves o viernes por la tarde.',
        due_date:    new Date('2025-04-05'),
        completed:   false,
        priority:    TaskPriority.HIGH,
        deal_id:     deal1.id,
        client_id:   client1.id,
        assigned_to: agent.id,
        created_by:  agent.id,
      },
      {
        title:       'Preparar contrato de arrendamiento para Sofía',
        description: 'Borrador de contrato una vez confirmada la reducción de precio.',
        due_date:    new Date('2025-04-10'),
        completed:   false,
        priority:    TaskPriority.URGENT,
        deal_id:     deal2.id,
        client_id:   client2.id,
        assigned_to: agent.id,
        created_by:  admin.id,
      },
      {
        title:       'Enviar dosier del solar a Inversiones Romero',
        description: 'Incluir: plano catastral, informe urbanístico, memoria de calidades y estimación de costes.',
        due_date:    new Date('2025-04-08'),
        completed:   false,
        priority:    TaskPriority.MEDIUM,
        deal_id:     deal3.id,
        client_id:   client3.id,
        assigned_to: admin.id,
        created_by:  admin.id,
      },
      {
        title:       'Actualizar fotografías del ático en Salamanca',
        description: 'Contratar fotógrafo profesional. Solicitar fotos en horario de tarde para mejor luz.',
        due_date:    new Date('2025-04-12'),
        completed:   false,
        priority:    TaskPriority.MEDIUM,
        property_id: propSalamanca.id,
        assigned_to: agent.id,
        created_by:  admin.id,
      },
    ],
  });

  console.log('  ✓ Tasks: 4 created');

  // ── 6. Notes ──────────────────────────────────────────────────────────────
  // Notes — use skipDuplicates and connect only the matching entity to avoid polymorphic FK conflict
  await prisma.note.create({
    data: {
      content:     'El propietario confirma que acepta mascotas pequeñas si el inquilino aporta garantía adicional.',
      entity_type: 'PROPERTY',
      entity_id:   propBarcelona.id,
      author_id:   agent.id,
    },
  });

  await prisma.note.create({
    data: {
      content:     'Andrés tiene pre-aprobación hipotecaria por 900K€. Resto con fondos propios.',
      entity_type: 'CLIENT',
      entity_id:   client1.id,
      author_id:   agent.id,
    },
  });

  await prisma.note.create({
    data: {
      content:     'Negociación activa. Propietario acepta bajar hasta 2.250€/mes con contrato mínimo 2 años.',
      entity_type: 'DEAL',
      entity_id:   deal2.id,
      author_id:   agent.id,
    },
  });

  console.log('  ✓ Notes: 3 created');

  // ── 7. Web Contacts ───────────────────────────────────────────────────────
  await prisma.webContact.createMany({
    data: [
      {
        property_id: propSalamanca.id,
        name:        'Marta Fernández',
        email:       'marta.f@gmail.com',
        phone:       '+34 633 111 222',
        message:     'Buenos días, me gustaría concertar una visita para esta semana si fuera posible. Estoy muy interesada en el inmueble.',
        read:        false,
      },
      {
        property_id: null,
        name:        'Roberto Ibáñez',
        email:       'roberto.ibanez@hotmail.com',
        phone:       null,
        message:     'Busco piso en alquiler en Barcelona, Eixample o Gràcia, 2 habitaciones, hasta 2.000€/mes. ¿Tienen algo disponible?',
        read:        false,
      },
    ],
  });

  console.log('  ✓ WebContacts: 2 created');

  // ─────────────────────────────────────────────────────────────────────────
  console.log('\n✅  Seed completed successfully!\n');
  console.log('   Credentials:');
  console.log('   👤 admin@crminmobiliario.es  / Admin1234!  (ADMIN)');
  console.log('   👤 agente@crminmobiliario.es / Agent1234!  (AGENT)\n');
}

main()
  .catch((e) => {
    console.error('❌  Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
