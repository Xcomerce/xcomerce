import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, Search, Sparkles, ChevronLeft, ChevronRight, Zap, ShieldCheck, Star } from 'lucide-react'
import { useFeedProducts } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const BRAZILIAN_UFS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG',
  'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return 'Sob consulta'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const SLIDES = [
  {
    id: 1,
    gradient: 'from-brand-dark via-brand-primary to-[#1a3a8f]',
    badgeText: 'Homologação Garantida',
    iconType: 'sparkles',
    title: 'Fornecedores Homologados e Verificados',
    description: 'Todos os parceiros da plataforma passam por uma verificação rigorosa de CNPJ e documentos para garantir negociações e compras seguras.',
  },
  {
    id: 2,
    gradient: 'from-[#492289] via-[#7F3CEF] to-[#8E45EF]',
    badgeText: 'Economia & Agilidade',
    iconType: 'zap',
    title: 'Cotações Rápidas de Alta Confiança',
    description: 'Publique sua demanda em minutos e receba propostas de fornecedores regionais qualificados em até 24 horas.',
  },
  {
    id: 3,
    gradient: 'from-[#222889] via-[#3263F7] to-[#03A0FB]',
    badgeText: 'Fornecedores Ouro',
    iconType: 'shieldCheck',
    title: 'Fornecedores com Selo Ouro de Atendimento',
    description: 'Negocie diretamente com empresas que possuem o selo de entrega exemplar e construa uma parceria duradoura.',
  },
]

function renderIcon(type: string) {
  switch (type) {
    case 'sparkles':
      return <Sparkles size={12} className="text-yellow-400 animate-pulse" />
    case 'zap':
      return <Zap size={12} className="text-yellow-300 animate-bounce" />
    case 'shieldCheck':
      return <ShieldCheck size={12} className="text-emerald-400" />
    default:
      return null
  }
}

function getProductImage(nome: string, dbUrl: string | null): string | null {
  if (dbUrl) return dbUrl

  const nameLower = nome.toLowerCase()
  if (nameLower.includes('cimento')) return '/products/cimento.png'
  if (nameLower.includes('tijolo')) return '/products/tijolo.png'
  if (nameLower.includes('brita')) return '/products/brita.png'
  if (nameLower.includes('tinta') || nameLower.includes('esmalte')) return '/products/tinta.png'
  if (nameLower.includes('notebook') || nameLower.includes('computador') || nameLower.includes('switch') || nameLower.includes('impressora')) return '/products/notebook.png'
  if (nameLower.includes('arroz') || nameLower.includes('feijão') || nameLower.includes('azeite')) return '/products/arroz.png'
  if (nameLower.includes('água') || nameLower.includes('agua')) return '/products/agua.png'
  if (nameLower.includes('epi') || nameLower.includes('capacete') || nameLower.includes('uniforme')) return '/products/epi.png'
  if (nameLower.includes('caixa') || nameLower.includes('embalagem') || nameLower.includes('filme stretch') || nameLower.includes('saco')) return '/products/caixa.png'
  
  return null
}

function getBadgeVisibilityClass(index: number): string {
  if (index === 0 || index === 1) return 'inline-flex'
  if (index === 2) return 'hidden md:inline-flex'
  if (index === 3) return 'hidden lg:inline-flex'
  if (index === 4) return 'hidden xl:inline-flex'
  if (index === 5) return 'hidden 2xl:inline-flex'
  if (index === 6 || index === 7) return 'hidden 3xl:inline-flex'
  return 'hidden'
}

export function BuyerFeedPage() {
  const navigate = useNavigate()
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [selectedUf, setSelectedUf] = useState<string>('')
  const categoriesRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isHovered, setIsHovered] = useState(false)

  const { data: categories = [], isLoading: loadingCategories } = useCategories()
  const { data: products = [], isLoading: loadingProducts } = useFeedProducts({
    categoryId: selectedCategory || undefined,
    search: searchQuery || undefined,
    uf: selectedUf || undefined,
  })

  // Group products by category
  const groupedProducts = useMemo(() => {
    const groups: { [categoryId: string]: { categoryName: string; products: typeof products } } = {}
    
    products.forEach((product) => {
      const catId = product.category_id || 'other'
      const catName = product.category?.name || 'Outros'
      
      if (!groups[catId]) {
        groups[catId] = {
          categoryName: catName,
          products: [],
        }
      }
      groups[catId].products.push(product)
    })
    
    return Object.entries(groups).map(([id, group]) => {
      const categoryProducts = group.products
      const paddedProducts = [...categoryProducts]
      if (categoryProducts.length > 0) {
        while (paddedProducts.length < 12) {
          paddedProducts.push(
            ...categoryProducts.map((p, idx) => ({
              ...p,
              id: `${p.id}-dup-${paddedProducts.length + idx}`
            }))
          )
        }
      }
      return {
        categoryId: id,
        categoryName: group.categoryName,
        products: paddedProducts.slice(0, 12),
      }
    })
  }, [products])

  function handleScroll() {
    if (categoriesRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = categoriesRef.current
      setShowLeftArrow(scrollLeft > 5)
      setShowRightArrow(scrollLeft + clientWidth < scrollWidth - 5)
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      handleScroll()
    }, 150)
    return () => clearTimeout(timer)
  }, [categories, products])

  useEffect(() => {
    if (isHovered) return

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
    }, 6000)

    return () => clearInterval(interval)
  }, [isHovered])

  function scrollCategories(direction: 'left' | 'right') {
    if (categoriesRef.current) {
      const scrollAmount = 300
      categoriesRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      })
      setTimeout(handleScroll, 350)
    }
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Banner Superior Premium - Carrossel de Ofertas */}
      <div 
        className="relative overflow-hidden rounded-2xl h-[220px] sm:h-48 shadow-lg select-none"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {SLIDES.map((slide, idx) => (
          <div
            key={slide.id}
            className={cn(
              "absolute inset-0 w-full h-full p-6 md:p-8 text-white bg-gradient-to-r transition-all duration-700 ease-in-out flex flex-col justify-center",
              slide.gradient,
              currentSlide === idx ? "opacity-100 scale-100 z-10" : "opacity-0 scale-95 z-0 pointer-events-none"
            )}
          >
            <div className="relative z-10 max-w-2xl space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] sm:text-xs font-semibold uppercase tracking-wider backdrop-blur-sm w-fit">
                {renderIcon(slide.iconType)}
                {slide.badgeText}
              </span>
              <h2 className="font-display text-xl sm:text-2xl md:text-3xl font-bold leading-tight">
                {slide.title}
              </h2>
              <p className="text-xs sm:text-sm text-white/80 md:text-base line-clamp-3 sm:line-clamp-none">
                {slide.description}
              </p>
            </div>
            
            {/* Blurs decorativos */}
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-white/5 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-1/3 -mb-20 h-80 w-80 rounded-full bg-brand-accent/10 blur-3xl pointer-events-none" />
          </div>
        ))}

        {/* Indicadores de Paginação */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {SLIDES.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                currentSlide === idx ? "w-5 bg-white" : "w-1.5 bg-white/40 hover:bg-white/70"
              )}
              aria-label={`Ir para slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Categorias (Chips) */}
      <div className="relative flex items-center h-10">
        <button
          type="button"
          onClick={() => scrollCategories('left')}
          className={cn(
            "absolute -left-[18px] z-10 h-8 w-8 items-center justify-center rounded-full border border-border bg-background p-0 text-foreground shadow-md transition-all duration-200 hover:bg-secondary top-1/2 -translate-y-1/2 -mt-0.5",
            showLeftArrow ? "hidden md:flex" : "hidden"
          )}
          aria-label="Rolar para esquerda"
        >
          <ChevronLeft size={15} />
        </button>

        <div
          ref={categoriesRef}
          onScroll={handleScroll}
          className="flex overflow-x-auto gap-2 pb-2 no-scrollbar w-full scroll-smooth -mx-4 px-4 md:mx-0 md:px-0"
        >
          <button
            type="button"
            onClick={() => setSelectedCategory('')}
            className={`whitespace-nowrap rounded-full px-4 h-9 flex items-center justify-center text-sm font-semibold border transition-all duration-200 ${
              selectedCategory === ''
                ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                : 'bg-secondary/40 border-border/60 hover:bg-secondary/70 text-foreground'
            }`}
          >
            Todas
          </button>
          {loadingCategories ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 w-20 animate-pulse rounded-full bg-secondary" />
            ))
          ) : (
            categories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap rounded-full px-4 h-9 flex items-center justify-center text-sm font-semibold border transition-all duration-200 ${
                  selectedCategory === cat.id
                    ? 'bg-primary border-primary text-primary-foreground shadow-sm'
                    : 'bg-secondary/40 border-border/60 hover:bg-secondary/70 text-foreground'
                }`}
              >
                {cat.name}
              </button>
            ))
          )}
        </div>

        <button
          type="button"
          onClick={() => scrollCategories('right')}
          className={cn(
            "absolute -right-[18px] z-10 h-8 w-8 items-center justify-center rounded-full border border-border bg-background p-0 text-foreground shadow-md transition-all duration-200 hover:bg-secondary top-1/2 -translate-y-1/2 -mt-0.5",
            showRightArrow ? "hidden md:flex" : "hidden"
          )}
          aria-label="Rolar para direita"
        >
          <ChevronRight size={15} />
        </button>
      </div>

      {/* Título da Seção e Filtros de Busca/UF */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-display text-lg font-normal text-foreground">
          Em destaque
        </h3>
        <div className="flex w-full items-center gap-2 rounded-xl border border-border bg-secondary/50 px-3 py-1 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 sm:max-w-md">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            placeholder="Buscar produto por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground min-w-0"
          />
          <div className="h-5 w-px bg-border shrink-0" />
          <div className="relative shrink-0 flex items-center pr-4">
            <select
              value={selectedUf}
              onChange={(e) => setSelectedUf(e.target.value)}
              className="appearance-none bg-transparent py-2 pl-2 pr-4 text-sm font-medium text-muted-foreground hover:text-foreground focus:outline-none cursor-pointer"
            >
              <option value="">UF</option>
              {BRAZILIAN_UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-0.5 top-1/2 -translate-y-1/2 text-muted-foreground">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="space-y-4">
        {loadingProducts ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="space-y-2.5">
                <div className="aspect-[4/4.5] w-full animate-pulse bg-secondary rounded-xl" />
                <div className="space-y-2 px-0.5">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-secondary" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-secondary" />
                  <div className="h-4 w-1/3 animate-pulse rounded bg-secondary mt-1" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-12 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-secondary text-muted-foreground">
              <Package size={24} />
            </div>
            <h3 className="font-display text-lg font-semibold">Nenhum produto encontrado</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Tente redefinir seus filtros ou altere a busca para encontrar produtos dos fornecedores.
            </p>
          </div>
        ) : (
          <div className="space-y-16">
            {/* Seção Em Destaque (Primeira Seção) */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
                {products.slice(0, 12).map((product, index) => (
                  <div
                    key={`destaque-${product.id}`}
                    onClick={() =>
                      navigate('/buyer/demands/new', {
                        state: {
                          categoryId: product.category_id,
                          title: product.nome,
                          description: product.descricao || '',
                          city: product.cidade || '',
                          uf: product.uf || '',
                        },
                      })
                    }
                    className="cursor-pointer"
                  >
                    {/* Imagem do Produto */}
                    <div className="relative aspect-[4/4.5] w-full bg-secondary overflow-hidden rounded-xl border border-border/40 hover:border-primary/45 transition-all duration-300 hover:scale-[1.03] hover:shadow-sm">
                      <span className={cn(
                        "absolute top-2.5 left-2.5 z-10 items-center rounded-full bg-[#7F3CEF] px-2.5 py-0.5 text-[9px] font-bold text-white shadow-sm uppercase tracking-wider",
                        getBadgeVisibilityClass(index)
                      )}>
                        Destaque
                      </span>
                      {getProductImage(product.nome, product.image_url) ? (
                        <img
                          src={getProductImage(product.nome, product.image_url) || ''}
                          alt={product.nome}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                          <Package size={32} />
                        </div>
                      )}
                    </div>

                    {/* Conteúdo (Informações embaixo da foto) */}
                    <div className="mt-2.5 px-0.5 space-y-1.5">
                      <div className="space-y-0.5 min-w-0">
                        <h4 className="font-display font-semibold text-sm leading-tight text-foreground hover:text-primary transition-colors truncate" title={product.nome}>
                          {product.nome}
                        </h4>
                        <p className="text-xs text-muted-foreground truncate">
                          {product.supplier?.company
                            ? `${product.supplier.company.nome_fantasia || product.supplier.company.razao_social} ${product.category?.name ? `· ${product.category.name}` : ''}`
                            : product.category?.name || ''}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-1.5 pt-0.5">
                        <span className="font-display text-sm font-bold text-foreground">
                          {formatCurrency(product.preco_referencia)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Categorias (Seções Mais Procurados) */}
            {groupedProducts.map((group) => (
              <div key={group.categoryId} className="space-y-4">
                <h4 className="font-display text-base font-semibold text-foreground/80 pl-0.5 mt-8">
                  Mais procurados em {group.categoryName}
                </h4>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 md:gap-6 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 3xl:grid-cols-6">
                  {group.products.map((product) => (
                    <div
                      key={product.id}
                      onClick={() =>
                        navigate('/buyer/demands/new', {
                          state: {
                            categoryId: product.category_id,
                            title: product.nome,
                            description: product.descricao || '',
                            city: product.cidade || '',
                            uf: product.uf || '',
                          },
                        })
                      }
                      className="cursor-pointer"
                    >
                      {/* Imagem do Produto */}
                      <div className="relative aspect-[4/4.5] w-full bg-secondary overflow-hidden rounded-xl border border-border/40 hover:border-primary/45 transition-all duration-300 hover:scale-[1.03] hover:shadow-sm">
                        {getProductImage(product.nome, product.image_url) ? (
                          <img
                            src={getProductImage(product.nome, product.image_url) || ''}
                            alt={product.nome}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                            <Package size={32} />
                          </div>
                        )}
                      </div>

                      {/* Conteúdo (Informações embaixo da foto) */}
                      <div className="mt-2.5 px-0.5 space-y-1.5">
                        <div className="space-y-0.5 min-w-0">
                          <h4 className="font-display font-semibold text-sm leading-tight text-foreground hover:text-primary transition-colors truncate" title={product.nome}>
                            {product.nome}
                          </h4>
                          <p className="text-xs text-muted-foreground truncate">
                            {product.supplier?.company
                              ? `${product.supplier.company.nome_fantasia || product.supplier.company.razao_social} ${product.category?.name ? `· ${product.category.name}` : ''}`
                              : product.category?.name || ''}
                          </p>
                        </div>

                        <div className="flex items-center justify-between gap-1.5 pt-0.5">
                          <span className="font-display text-sm font-bold text-foreground">
                            {formatCurrency(product.preco_referencia)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
