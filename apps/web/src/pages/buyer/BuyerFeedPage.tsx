import { useState, useRef, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Package, ChevronLeft, ChevronRight, Rocket } from 'lucide-react'
import { useFeedProducts } from '@/hooks/use-products'
import { useCategories } from '@/hooks/use-categories'
import { cn } from '@/lib/utils'



function formatCurrency(value: number | null): string {
  if (value === null || value === undefined) return 'Sob consulta'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
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
  const [searchParams] = useSearchParams()
  const searchQuery = searchParams.get('search') || ''
  const selectedUf = searchParams.get('uf') || ''
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const categoriesRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(true)


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
      {/* Banner Superior Premium */}
      <div className="relative overflow-hidden rounded-xl h-[240px] sm:h-60 select-none bg-[#222689] flex items-center">
        {/* Lado Esquerdo (Conteúdo e Textos) */}
        <div className="relative z-20 pl-6 pr-4 sm:pl-10 max-w-[65%] sm:max-w-[70%] flex flex-col justify-center space-y-4">
          <h2 className="font-display font-bold text-white text-sm sm:text-lg md:text-xl lg:text-2xl leading-snug tracking-tight">
            Suas vendas não podem parar.<br />
            Seus novos fornecedores estão no <span className="text-[#a5f3fc]">XCOMERCE</span>.
          </h2>
          
          <div className="flex items-center gap-4 sm:gap-8 text-white/95">
            {/* Item 1 */}
            <div className="flex flex-col items-center text-center space-y-1 sm:space-y-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-8 h-8 sm:w-10 sm:h-10 text-white"
              >
                <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.75z" />
                <path d="m9 12 2 2 4-4" />
                <path d="M8.5 17.5 6 22.5 9.5 21 11.5 17.5" />
                <path d="M15.5 17.5 18 22.5 14.5 21 12.5 17.5" />
              </svg>
              <div className="text-[8px] sm:text-[10px] md:text-xs font-medium leading-tight uppercase tracking-wider font-sans text-white/95">
                Fornecedores<br />
                Pré-Qualificados
              </div>
            </div>

            {/* Separador */}
            <div className="h-10 sm:h-12 w-px bg-white/20 self-center" />

            {/* Item 2 */}
            <div className="flex flex-col items-center text-center space-y-1 sm:space-y-1.5">
              <Rocket className="w-8 h-8 sm:w-10 sm:h-10 text-white" strokeWidth={1.75} />
              <div className="text-[8px] sm:text-[10px] md:text-xs font-medium leading-tight uppercase tracking-wider font-sans text-white/95">
                Agilidade e<br />
                Transparência
              </div>
            </div>
          </div>
        </div>

        {/* Lado Direito (Foto do Homem com Efeito de Fade) */}
        <div className="absolute right-0 top-0 h-full w-[42%] sm:w-[35%] md:w-[30%] overflow-hidden z-10">
          {/* Gradiente de fade para misturar com o fundo azul */}
          <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#222689] via-[#222689]/40 to-transparent w-12 sm:w-20 z-20" />
          <img
            src="/feed-banner-man.png"
            alt="Profissional XCommerce"
            className="w-full h-full object-cover object-top"
          />
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

      {/* Título da Seção */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="font-display text-lg font-normal text-foreground">
          Em destaque
        </h3>
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
